import React from 'react';
import { Mail } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { KeyContactsProps } from './OnboardingTypes';

export const KeyContacts: React.FC<KeyContactsProps> = ({ contacts, showToast }) => {
    return (
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
            <div className="p-5 border-b border-border-light dark:border-border-dark">
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Key Contacts</h2>
            </div>
            <div className="p-4 space-y-3">
                {contacts.map(contact => (
                    <div key={contact.id} className="flex items-center gap-3 p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors">
                        <Avatar src={contact.avatar} name={contact.name} size="lg" className="ring-1 ring-border-light dark:ring-border-dark" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-light dark:text-text-dark">{contact.name}</p>
                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{contact.role} • {contact.relation}</p>
                        </div>
                        <button
                            onClick={() => showToast('Email client opened!', 'info')}
                            className="p-2 text-text-muted-light hover:text-primary transition-colors"
                            title="Send Email"
                        >
                            <Mail size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
