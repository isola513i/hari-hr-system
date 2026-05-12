import { Router } from 'express';
import OTRequestController from '../controllers/OTRequestController';
import { authenticateToken, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', OTRequestController.create.bind(OTRequestController));
router.get('/my', OTRequestController.getMyRequests.bind(OTRequestController));
router.get('/stats', requireAdmin, OTRequestController.getStats.bind(OTRequestController));
router.get('/', requireAdmin, OTRequestController.getAll.bind(OTRequestController));
router.put('/:id/approve', requireAdmin, OTRequestController.approve.bind(OTRequestController));
router.put('/:id/reject', requireAdmin, OTRequestController.reject.bind(OTRequestController));
router.delete('/:id', OTRequestController.cancel.bind(OTRequestController));

export default router;
