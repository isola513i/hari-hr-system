import React from 'react';
import { Edit2, Save, Plus, X, Shield, Clock } from 'lucide-react';
import { OverviewTabProps } from './EmployeeDetailTypes';

export const OverviewTab: React.FC<OverviewTabProps> = ({
    employee,
    permissions,
    currentSkills,
    isEditingSkills,
    newSkillInput,
    onSetIsEditingSkills,
    onSetNewSkillInput,
    onAddSkill,
    onRemoveSkill,
    onSaveSkills,
    onCancelSkills,
}) => {
    const { canEditBasicInfo } = permissions;

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2">About</h3>
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark leading-relaxed">
                    {employee.bio || "No bio available."}
                </p>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Skills</h3>
                    {canEditBasicInfo && (
                        !isEditingSkills ? (
                            <button
                                onClick={() => onSetIsEditingSkills(true)}
                                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                            >
                                <Edit2 size={12} /> Edit Skills
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={onCancelSkills}
                                    className="text-xs font-medium text-text-muted-light hover:text-text-light dark:hover:text-text-dark px-2 py-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onSaveSkills}
                                    className="flex items-center gap-1 text-xs font-medium bg-primary text-white px-2.5 py-1 rounded hover:bg-primary/90"
                                >
                                    <Save size={12} /> Save
                                </button>
                            </div>
                        )
                    )}
                </div>

                {isEditingSkills ? (
                    <div className="space-y-4 p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newSkillInput}
                                onChange={(e) => onSetNewSkillInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && onAddSkill()}
                                placeholder="Add a new skill..."
                                className="flex-1 px-3 py-1.5 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded focus:outline-none focus:ring-1 focus:ring-primary text-text-light dark:text-text-dark"
                            />
                            <button
                                onClick={onAddSkill}
                                disabled={!newSkillInput.trim()}
                                className="p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded disabled:opacity-50 disabled:hover:bg-primary/10 disabled:hover:text-primary transition-colors"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {currentSkills.map(skill => (
                                <span key={skill} className="inline-flex items-center px-3 py-1 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-full text-xs font-medium text-text-light dark:text-text-dark">
                                    {skill}
                                    <button
                                        onClick={() => onRemoveSkill(skill)}
                                        className="ml-2 text-text-muted-light hover:text-accent-red"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {currentSkills.length > 0 ? (
                            currentSkills.map(skill => (
                                <span key={skill} className="px-3 py-1 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-full text-xs font-medium text-text-light dark:text-text-dark hover:border-primary/50 transition-colors cursor-default">
                                    {skill}
                                </span>
                            ))
                        ) : (
                            <span className="text-sm text-text-muted-light dark:text-text-muted-dark">No skills listed.</span>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-background-light dark:bg-background-dark/50 rounded-lg border border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="text-accent-green" size={20} />
                        <p className="font-semibold text-text-light dark:text-text-dark">Employment Status</p>
                    </div>
                    <p className="text-sm text-text-muted-light dark:text-text-muted-dark pl-8">Full-Time • Permanent</p>
                </div>
                <div className="p-4 bg-background-light dark:bg-background-dark/50 rounded-lg border border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="text-accent-orange" size={20} />
                        <p className="font-semibold text-text-light dark:text-text-dark">Work Schedule</p>
                    </div>
                    <p className="text-sm text-text-muted-light dark:text-text-muted-dark pl-8">Mon-Fri • 9:00 AM - 5:00 PM</p>
                </div>
            </div>
        </div>
    );
};
