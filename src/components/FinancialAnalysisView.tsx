import React, { useState } from "react";
import {
  TrendingUp,
  BrainCircuit,
  Sparkles,
  BarChart3,
  Lightbulb,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { Account, CompanySettings, FinancialAnalysisResult } from "../types";

interface FinancialAnalysisViewProps {
  accounts: Account[];
  companySettings: CompanySettings;
  analysisResult: FinancialAnalysisResult | null;
  isLoadingAnalysis: boolean;
  onRequestAiAnalysis: () => void;
}

export const FinancialAnalysisView: React.FC<FinancialAnalysisViewProps> = ({
  accounts,
  companySettings,
  analysisResult,
  isLoadingAnalysis,
  onRequestAiAnalysis,
}) => {
  // Compute Key Financial Ratios using sub-accounts
  const assetAccounts = accounts.filter((a) => !a.isHeader && a.type === "ASSET");
  const liabilityAccounts = accounts.filter((a) => !a.isHeader && a.type === "LIABILITY");
  const revenueAccounts = accounts.filter((a) => !a.isHeader && a.type === "REVENUE");
  const expenseAccounts = accounts.filter((a) => !a.isHeader && a.type === "EXPENSE");

  const totalAssets = assetAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const totalLiabilities = liabilityAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const totalRevenues = revenueAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const totalExpenses = expenseAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const netProfit = totalRevenues - totalExpenses;

  const currentRatio = totalLiabilities > 0 ? (totalAssets / totalLiabilities).toFixed(2) : "ممتاز (>3)";
  const netProfitMargin = totalRevenues > 0 ? ((netProfit / totalRevenues) * 100).toFixed(1) : "0";
  const returnOnAssets = totalAssets > 0 ? ((netProfit / totalAssets) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span>التحليل المالي وتوصيات زيادة الإنتاجية والكفاءة</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            مؤشرات الربحية والسيولة مع تشخيص الذكاء الاصطناعي الفوري لأسباب زيادة الإنتاجية وتقليل الهدر
          </p>
        </div>

        <button
          onClick={onRequestAiAnalysis}
          disabled={isLoadingAnalysis}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-lg disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{isLoadingAnalysis ? "جاري تشغيل محرك الذكاء الاصطناعي..." : "توليد تحليل مالي بـ Gemini AI"}</span>
        </button>
      </div>

      {/* Financial Ratios Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-slate-400">نسبة السيولة التداولية (Current Ratio)</span>
          <p className="text-2xl font-extrabold text-emerald-400">{currentRatio}</p>
          <p className="text-[10px] text-slate-500">يقيس قدرة الشركة على سداد التزاماتها</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-slate-400">هامش صافي الربح (Profit Margin)</span>
          <p className="text-2xl font-extrabold text-blue-400">{netProfitMargin}%</p>
          <p className="text-[10px] text-slate-500">نسبة الربح الصافي مقارنة بإجمالي الإيرادات</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-slate-400">العائد على الأصول (ROA)</span>
          <p className="text-2xl font-extrabold text-purple-400">{returnOnAssets}%</p>
          <p className="text-[10px] text-slate-500">كفاءة تشغيل واستغلال أصول الشركة</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-slate-400">نسبة المصروفات إلى الإيرادات</span>
          <p className="text-2xl font-extrabold text-amber-400">
            {totalRevenues > 0 ? ((totalExpenses / totalRevenues) * 100).toFixed(1) : 0}%
          </p>
          <p className="text-[10px] text-slate-500">حجم التكاليف التشغيلية من المبيعات</p>
        </div>
      </div>

      {/* AI Diagnostic Output */}
      {analysisResult ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">تقرير التحليل المالي الذكي وأسباب زيادة الإنتاجية</h3>
              <p className="text-xs text-slate-400">تم التوليد بناءً على البيانات المالية الفعلية للمؤسسة</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>الملخص التنفيذي للأداء المالي:</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3.5 rounded-lg border border-slate-800">
              {analysisResult.summary}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>أسباب مقترحة وزيادة الإنتاجية وتقليل التكاليف:</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysisResult.productivityCauses.map((cause, idx) => (
                <div key={idx} className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 text-xs text-slate-200 space-y-1">
                  <span className="font-bold text-blue-400 block">سبب #{idx + 1}:</span>
                  <p>{cause}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>التوصيات والخطوات العملية القادمة:</span>
            </h4>
            <ul className="list-disc list-inside text-xs text-slate-300 space-y-2 bg-slate-800/40 p-4 rounded-lg border border-slate-800">
              {analysisResult.recommendations.map((rec, idx) => (
                <li key={idx} className="leading-relaxed">{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
          <BrainCircuit className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-300 text-sm">انقر على زر "توليد تحليل مالي بـ Gemini AI" أعلاه</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            يقوم المحرك المالي بتحليل دفتر اليومية والميزانية وإعطاء نصائح محددة لرفع الإنتاجية وتقليل المصروفات.
          </p>
        </div>
      )}

    </div>
  );
};
