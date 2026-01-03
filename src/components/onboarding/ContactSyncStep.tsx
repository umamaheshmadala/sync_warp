/**
 * Contact Sync Onboarding Step
 * Story 9.2.7: Onboarding integration
 */

import React, { useState } from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { ContactSyncModal } from '../contacts/ContactSyncModal';

interface ContactSyncStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function ContactSyncStep({ onComplete, onSkip }: ContactSyncStepProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <Users className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Find Friends from Contacts
        </h2>
        <p className="text-gray-600">
          Discover which of your contacts are already on SynC and connect instantly
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <span>Sync Contacts</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onSkip}
          className="w-full px-6 py-3 text-gray-600 hover:text-gray-900"
        >
          Skip for now
        </button>
      </div>

      <ContactSyncModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          onSkip(); // Treat close as skip
        }}
      />
    </div>
  );
}
