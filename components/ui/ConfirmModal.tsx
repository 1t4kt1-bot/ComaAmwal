
import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title = "تأكيد الحذف", message, confirmText = "حذف نهائي" }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center text-center p-4">
        <div className="bg-red-100 p-3 rounded-full text-red-600 mb-4 animate-bounce">
          <AlertTriangle size={32} />
        </div>
        <p className="text-gray-800 font-bold text-lg mb-2">هل أنت متأكد؟</p>
        <p className="text-gray-500 mb-6 text-sm">{message}</p>
        <div className="flex gap-3 w-full">
           <Button variant="secondary" onClick={onClose} className="flex-1">إلغاء</Button>
           <Button variant="danger" onClick={() => { onConfirm(); onClose(); }} className="flex-1">{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
