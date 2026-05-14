import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middlewares/auth';
import { apiLimiter } from '../middlewares/security';
import { query } from '../db';

const router = Router();
router.use(authenticateToken);

const ASSET_SELECT = `
  SELECT a.*, e.name AS assigned_to_name, e.department AS assigned_to_department
  FROM company_assets a
  LEFT JOIN employees e ON e.id = a.assigned_to
`;

function mapRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    assetType: row.asset_type,
    serialNumber: row.serial_number,
    status: row.status,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to_name,
    assignedToDepartment: row.assigned_to_department,
    assignedAt: row.assigned_at,
    purchaseDate: row.purchase_date,
    purchasePrice: row.purchase_price ? parseFloat(row.purchase_price) : null,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/assets — list all (admin) or own assets (employee)
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const isAdmin = user.role === 'HR_ADMIN' || user.role === 'MANAGER';

    let result;
    if (isAdmin) {
      const { status, search } = req.query as { status?: string; search?: string };
      const conditions: string[] = [];
      const params: any[] = [];
      if (status) { conditions.push(`a.status = $${params.length + 1}`); params.push(status); }
      if (search) { conditions.push(`(a.name ILIKE $${params.length + 1} OR a.serial_number ILIKE $${params.length + 1})`); params.push(`%${search}%`); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      result = await query(`${ASSET_SELECT} ${where} ORDER BY a.created_at DESC`, params);
    } else {
      result = await query(
        `${ASSET_SELECT} WHERE a.assigned_to = (SELECT id FROM employees WHERE user_id = $1) ORDER BY a.assigned_at DESC`,
        [user.id]
      );
    }
    res.json(result.rows.map(mapRow));
  } catch (err) {
    console.error('GET /assets error:', err);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// GET /api/assets/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(`${ASSET_SELECT} WHERE a.id = $1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Asset not found' });
    res.json(mapRow(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

// POST /api/assets — create (admin only)
router.post('/', requireAdmin, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { name, assetType, serialNumber, status, purchaseDate, purchasePrice, notes } = req.body;
    if (!name || !assetType) return res.status(400).json({ error: 'name and assetType are required' });

    const result = await query(
      `INSERT INTO company_assets (name, asset_type, serial_number, status, purchase_date, purchase_price, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, assetType, serialNumber || null, status || 'Available', purchaseDate || null, purchasePrice || null, notes || null]
    );
    const row = await query(`${ASSET_SELECT} WHERE a.id = $1`, [result.rows[0].id]);
    res.status(201).json(mapRow(row.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// PATCH /api/assets/:id — update (admin only)
router.patch('/:id', requireAdmin, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { name, assetType, serialNumber, status, purchaseDate, purchasePrice, notes } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    const add = (col: string, val: any) => { updates.push(`${col} = $${params.length + 1}`); params.push(val); };

    if (name !== undefined) add('name', name);
    if (assetType !== undefined) add('asset_type', assetType);
    if (serialNumber !== undefined) add('serial_number', serialNumber || null);
    if (status !== undefined) add('status', status);
    if (purchaseDate !== undefined) add('purchase_date', purchaseDate || null);
    if (purchasePrice !== undefined) add('purchase_price', purchasePrice || null);
    if (notes !== undefined) add('notes', notes || null);

    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(req.params.id);

    await query(`UPDATE company_assets SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    const row = await query(`${ASSET_SELECT} WHERE a.id = $1`, [req.params.id]);
    if (!row.rows.length) return res.status(404).json({ error: 'Asset not found' });
    res.json(mapRow(row.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// POST /api/assets/:id/assign — assign to employee (admin only)
router.post('/:id/assign', requireAdmin, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });

    const asset = await query(`SELECT status FROM company_assets WHERE id = $1`, [req.params.id]);
    if (!asset.rows.length) return res.status(404).json({ error: 'Asset not found' });
    if (asset.rows[0].status === 'Retired') return res.status(400).json({ error: 'Cannot assign a retired asset' });

    await query(
      `UPDATE company_assets SET assigned_to = $1, assigned_at = CURRENT_TIMESTAMP, status = 'Assigned', updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [employeeId, req.params.id]
    );
    const row = await query(`${ASSET_SELECT} WHERE a.id = $1`, [req.params.id]);
    res.json(mapRow(row.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign asset' });
  }
});

// POST /api/assets/:id/unassign — unassign from employee (admin only)
router.post('/:id/unassign', requireAdmin, apiLimiter, async (req: Request, res: Response) => {
  try {
    await query(
      `UPDATE company_assets SET assigned_to = NULL, assigned_at = NULL, status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [req.params.id]
    );
    const row = await query(`${ASSET_SELECT} WHERE a.id = $1`, [req.params.id]);
    if (!row.rows.length) return res.status(404).json({ error: 'Asset not found' });
    res.json(mapRow(row.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to unassign asset' });
  }
});

// DELETE /api/assets/:id (admin only)
router.delete('/:id', requireAdmin, apiLimiter, async (req: Request, res: Response) => {
  try {
    const result = await query(`DELETE FROM company_assets WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Asset not found' });
    res.json({ message: 'Asset deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

export default router;
