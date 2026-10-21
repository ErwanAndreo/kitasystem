import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Check, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface DatevExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatevExportModal: React.FC<DatevExportModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    if (isOpen) {
      loadDatevData();
    }
  }, [isOpen, month]);

  const loadDatevData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/export/datev?month=${month}`);
      const json = await res.json();
      setData(json.exportRows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (data.length === 0) return;
    const headers = ['Personal-Nr', 'Name', 'Rolle', 'Vertragsstunden/Woche', 'Soll-Monat', 'Ist-Monat', 'Differenz/Überstunden', 'Status'];
    const rows = data.map(d => [
      d.personal_nr,
      `"${d.name}"`,
      d.role,
      d.contract_hours,
      d.target_month_hours,
      d.actual_hours,
      d.overtime_hours,
      `"${d.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DATEV_Lohnexport_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Lohnexport & Monatsabschluss (DATEV / LODAS)
              </h3>
              <p className="text-xs text-slate-500">
                Arbeitszeiten, Überstundenkonten & Gehaltsabrechnung
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-between my-4 bg-slate-50 p-3 rounded-xl">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Abrechnungsmonat:</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg bg-white text-xs font-bold"
            />
          </div>

          <button
            onClick={handleDownloadCsv}
            disabled={loading || data.length === 0}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>DATEV-CSV herunterladen</span>
          </button>
        </div>

        {/* Table */}
        <div className="max-h-[360px] overflow-y-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="p-2.5">Pers.-Nr</th>
                <th className="p-2.5">Mitarbeiter</th>
                <th className="p-2.5">Vertrag</th>
                <th className="p-2.5">Soll (Std)</th>
                <th className="p-2.5">Ist (Std)</th>
                <th className="p-2.5">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row) => (
                <tr key={row.personal_nr} className="hover:bg-slate-50">
                  <td className="p-2.5 font-mono text-slate-500">{row.personal_nr}</td>
                  <td className="p-2.5 font-bold text-slate-900">{row.name}</td>
                  <td className="p-2.5 text-slate-600">{row.contract_hours}h / Wo</td>
                  <td className="p-2.5 text-slate-600">{row.target_month_hours}</td>
                  <td className="p-2.5 font-bold text-slate-900">{row.actual_hours}</td>
                  <td className="p-2.5">
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                        row.overtime_hours >= 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {row.overtime_hours > 0 ? `+${row.overtime_hours}h` : `${row.overtime_hours}h`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
