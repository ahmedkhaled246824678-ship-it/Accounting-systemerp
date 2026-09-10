import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title = "تأكيد الحذف النهائي",
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#11141B] border border-gray-800 rounded-xl w-full max-w-sm p-5 text-[#E2E8F0] space-y-4 shadow-2xl relative">
        <button
          onClick={onCancel}
          className="absolute left-3 top-3 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 text-rose-400">
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">إجراء لا يمكن التراجع عنه</p>
          </div>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed bg-gray-900/60 p-3 rounded-lg border border-gray-800">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800/80">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 bg-[#1A1F26] hover:bg-gray-800 text-gray-300 rounded-lg text-xs font-medium transition"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-900/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>نعم، حذف الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
};
