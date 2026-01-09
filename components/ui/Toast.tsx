
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ToastProps {
  msg: string;
  type: 'success' | 'error';
}

const Toast: React.FC<ToastProps> = ({ msg, type }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2800);
      return () => clearTimeout(timer);
  }, []);

  return createPortal(
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 transform ${visible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}`}>
        <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[320px] max-w-md border ${type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            <div className={`p-2 rounded-full ${type === 'error' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {type === 'error' ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
            </div>
            <div className="flex-1">
                <p className="font-bold text-sm">{type === 'error' ? 'خطأ في العملية' : 'تمت العملية بنجاح'}</p>
                <p className="text-xs opacity-90 font-medium">{msg}</p>
            </div>
        </div>
    </div>,
    document.body
  );
};

export default Toast;
