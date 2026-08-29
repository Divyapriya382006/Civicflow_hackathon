import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Layers, Terminal, AlertCircle, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ServiceWorkflow } from '../types';
import { RuntimeEvent } from '../runtime/eventClient';

interface RuntimeBrowserPanelProps {
  service: ServiceWorkflow;
  events: RuntimeEvent[];
  currentStepIndex?: number;
  applicantData?: Record<string, string>;
}

export const RuntimeBrowserPanel: React.FC<RuntimeBrowserPanelProps> = ({
  service,
  events,
  currentStepIndex = 0,
  applicantData = {},
}) => {
  const latestObservation = [...events].reverse().find((event) => event.type === 'DOM_OBSERVED');
  const latestAction = [...events].reverse().find((event) => event.type === 'ACTION_EXECUTED');
  const isCompleted = events.some((event) => event.type === 'WORKFLOW_COMPLETED');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const generatedRef = useRef(false);

  const portalUrl = service.officialPortal || '/portals/site1_ncs.html#/ncs-registration';
  const urlDisplay = latestObservation?.data?.url ? String(latestObservation.data.url) : portalUrl;
  const currentStep = service.steps[currentStepIndex] || service.steps[0];

  const formEntries = useMemo(() => {
    const merged: Record<string, string> = { ...applicantData };
    service.fields.forEach((field) => {
      const value = applicantData[field.id] ?? applicantData[field.id.toLowerCase()] ?? applicantData[field.label.toLowerCase().replace(/\s+/g, '_')];
      if (typeof value === 'string' && value.trim()) merged[field.label] = value.trim();
    });

    return Object.entries(merged)
      .filter(([, value]) => typeof value === 'string' && value.trim())
      .map(([key, value]) => ({ key, value: String(value).trim() }));
  }, [applicantData, service.fields]);

  const generateGovernmentPdf = () => {
    if (typeof window === 'undefined') return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const govBlue = [15, 42, 90];
    const accentGold = [204, 162, 80];

    doc.setFillColor(...govBlue);
    doc.rect(0, 0, pageWidth, 84, 'F');
    doc.setFillColor(...accentGold);
    doc.rect(0, 84, pageWidth, 6, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Government of India', 40, 38);
    doc.setFontSize(11);
    doc.text(service.departmentId.toUpperCase().replace(/_/g, ' '), 40, 58);

    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.text(service.title, 40, 120);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Application Reference: CF-${Date.now().toString().slice(-8)}`, 40, 140);
    doc.text(`Submitted on: ${new Date().toLocaleString()}`, 40, 156);

    doc.setDrawColor(210, 214, 220);
    doc.line(40, 172, pageWidth - 40, 172);

    doc.setFillColor(244, 247, 250);
    doc.roundedRect(40, 185, pageWidth - 80, 300, 10, 10, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 42, 90);
    doc.setFontSize(12);
    doc.text('Applicant Details', 58, 214);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(34, 34, 34);
    doc.setFontSize(10);

    let y = 236;
    const rows = formEntries.length ? formEntries : [
      { key: 'Service', value: service.title },
      { key: 'Status', value: 'Submitted Successfully' },
    ];

    rows.forEach(({ key, value }) => {
      if (y > pageHeight - 120) {
        doc.addPage();
        y = 56;
      }

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(58, y - 12, pageWidth - 120, 22, 6, 6, 'F');
      doc.setTextColor(41, 65, 105);
      doc.setFont('helvetica', 'bold');
      doc.text(key.length > 26 ? `${key.slice(0, 26)}...` : key, 72, y + 2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
      doc.text(value.length > 52 ? `${value.slice(0, 52)}...` : value, 220, y + 2, { maxWidth: 260 });
      y += 28;
    });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 42, 90);
    doc.setFontSize(11);
    doc.text('Declaration', 58, pageHeight - 108);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    const declaration = 'I declare that the information provided in this application is true, complete, and accurate to the best of my knowledge.';
    doc.text(declaration, 58, pageHeight - 90, { maxWidth: pageWidth - 120 });

    doc.setDrawColor(...accentGold);
    doc.line(58, pageHeight - 72, pageWidth - 58, pageHeight - 72);

    doc.setTextColor(15, 42, 90);
    doc.setFont('helvetica', 'bold');
    doc.text('Authorized Digital Signature', 58, pageHeight - 48);

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  useEffect(() => {
    if (!isCompleted || generatedRef.current) return;
    generatedRef.current = true;
    generateGovernmentPdf();
  }, [isCompleted]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden backdrop-blur-md h-full">
      <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm text-white">Automation Status</span>
            <p className="text-xs text-slate-400">Direct browser execution without portal preview</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          {isCompleted ? 'COMPLETED' : latestObservation ? 'OBSERVED' : 'READY'}
        </span>
      </div>

      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800/80 flex items-center gap-2 text-xs">
        <Globe className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span className="font-mono text-slate-300 truncate">{urlDisplay}</span>
      </div>

      <div className="relative flex-1 bg-slate-950 min-h-[620px] flex flex-col justify-center p-6">
        {isCompleted ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-6 text-center shadow-lg shadow-emerald-900/10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-2xl">✓</div>
            <h3 className="text-2xl font-bold text-emerald-300">Application Submitted</h3>
            <p className="mt-2 text-sm text-emerald-100/80">The workflow completed successfully and the confirmation was received.</p>
            <div className="mt-5 inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-900/40 px-3 py-1 text-xs font-semibold text-emerald-200">
              Confirmation recorded
            </div>
            <div className="mt-6 flex justify-center">
              <a
                href={pdfUrl ?? undefined}
                download="government-application-summary.pdf"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Download submitted application as PDF"
                onClick={(event) => {
                  if (!pdfUrl) {
                    event.preventDefault();
                  }
                }}
              >
                <Download className="w-4 h-4" />
                {pdfUrl ? 'Download Government PDF' : 'Preparing PDF...'}
              </a>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl text-blue-300">•</div>
            <h3 className="text-xl font-semibold text-white">Waiting for workflow completion</h3>
            <p className="mt-2 text-sm text-slate-400">The browser automation is running without showing the live portal preview.</p>
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-900/95 border-t border-slate-800 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
            <Layers className="w-4 h-4 text-blue-400" />
            Active Step Target: <span className="text-white">{currentStep?.title}</span>
          </span>
          <span className="font-mono text-[10px] text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800">
            {currentStep?.targetSelector || 'data-testid'}
          </span>
        </div>

        {latestAction ? (
          <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-[11px] flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>Executed: {String(latestAction.data.action)}</span>
          </div>
        ) : (
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Targeting elements via data-testid for Playwright DOM extraction...</span>
          </div>
        )}
      </div>
    </div>
  );
};

