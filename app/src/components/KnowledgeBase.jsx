// Knowledge Base: the practitioner reference behind ChangeFlow.
// Seeded with the measurement map, the framework translations, and the
// scoring guides — the manual-practice knowledge the tool translates.
import { useState } from 'react'
import { MODALITIES, lensModalityNote } from '../lib/modalities.js'
import { MEASUREMENT_GUIDE, TRANSLATION_RULE } from '../lib/knowledge.js'
import { readinessScore } from '../data/mockData.js'

const SECTIONS = [
  { id: 'measure', label: 'Measurement Guide' },
  { id: 'frameworks', label: 'Framework Translations' },
  { id: 'scoring', label: 'Scoring Guides' },
]

const LENSES = [
  { id: 'adkar', label: 'ADKAR' },
  { id: 'kotter', label: 'Kotter' },
  { id: 'lewin', label: 'Lewin' },
]

const TYPE_STYLES = {
  'Quantitative': 'bg-[#cfe3fb] text-[#0060c9] border-[#a9ccf7]',
  'Qualitative · anchored': 'bg-[#e9d5ff] text-[#7e22ce] border-[#d8b4fe]',
  'Mixed': 'bg-[#c9f3dc] text-[#00854d] border-[#9ae6b8]',
}

function TypeBadge({ type }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TYPE_STYLES[type] || 'bg-slate-100 text-slate-600 border-slate-300'}`}>
      {type}
    </span>
  )
}

function MeasurementGuide() {
  const rows = MEASUREMENT_GUIDE.flatMap(g =>
    g.metrics.map(m => ({ phase: g.phase, ...m }))
  )
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">Quick reference</h3>
          <p className="text-sm text-slate-500 mt-0.5">Every ChangeFlow metric, its practitioner term, and its type at a glance.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2.5 font-semibold">Phase</th>
                <th className="px-5 py-2.5 font-semibold">Metric</th>
                <th className="px-5 py-2.5 font-semibold">Practitioner term</th>
                <th className="px-5 py-2.5 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={i % 2 ? 'bg-[#f6fafe]' : 'bg-white'}>
                  <td className="px-5 py-2.5 text-slate-600">{r.phase}</td>
                  <td className="px-5 py-2.5 font-medium text-slate-900">{r.metric}</td>
                  <td className="px-5 py-2.5 text-slate-600">{r.term}</td>
                  <td className="px-5 py-2.5"><TypeBadge type={r.type} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {MEASUREMENT_GUIDE.map(g => (
        <div key={g.phase} className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-lg">{g.phase}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{g.intro}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {g.metrics.map(m => (
              <div key={m.metric} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-slate-900">{m.metric}</h4>
                  <span className="text-sm text-slate-500">· {m.term}</span>
                  <TypeBadge type={m.type} />
                </div>
                <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                  <span className="font-semibold">Measured in manual practice: </span>{m.measured}
                </p>
                <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
                  <span className="font-semibold">Links to in ChangeFlow: </span>{m.links}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function FrameworkTranslations() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 leading-relaxed">
        ChangeFlow is principles first; the frameworks are translations, not the method.
        Each phase below is rendered in the language of ADKAR, Kotter, and Lewin so
        practitioners trained in any of them can find their footing.
      </p>
      {MODALITIES.map(m => (
        <div key={m.id} className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-4">
          <h3 className="font-bold text-slate-900">{m.label}</h3>
          <div className="mt-2 space-y-1.5">
            {LENSES.map(l => {
              const note = lensModalityNote(m.id, l.id)
              if (!note) return null
              return (
                <p key={l.id} className="text-sm text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-800">{l.label}: </span>{note}
                </p>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function ScoringGuides() {
  const dims = readinessScore?.dimensions || []
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-4">
        <h3 className="font-bold text-slate-900 text-lg">How qualitative becomes a number</h3>
        <div className="mt-2 space-y-2">
          {TRANSLATION_RULE.map((p, i) => (
            <p key={i} className="text-sm text-slate-700 leading-relaxed">{p}</p>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-lg">Readiness dimension rubrics</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            What each dimension measures and how to score it — the same guidance shown
            in the Assess source drill down.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {dims.map(d => (
            <div key={d.label} className="px-5 py-4">
              <h4 className="font-bold text-slate-900">{d.label}</h4>
              {d.description && (
                <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
                  <span className="font-semibold">What this measures: </span>{d.description}
                </p>
              )}
              {d.guidance && (
                <p className="text-sm text-slate-700 mt-1.5 leading-relaxed whitespace-pre-line">
                  <span className="font-semibold">How to score it: </span>{d.guidance}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function KnowledgeBase() {
  const [section, setSection] = useState('measure')
  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">Knowledge Base</h2>
        <p className="text-sm text-slate-600 mt-1">
          The practitioner knowledge behind the tool: how each metric is measured by hand,
          what the frameworks call each phase, and how qualitative judgment becomes a score.
        </p>
      </div>

      <div className="no-print flex gap-1 mb-5 bg-slate-100 border border-slate-200 rounded-full p-1 w-fit">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition ${
              section === s.id
                ? 'bg-white text-[#0060c9] shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'measure' && <MeasurementGuide />}
      {section === 'frameworks' && <FrameworkTranslations />}
      {section === 'scoring' && <ScoringGuides />}
    </div>
  )
}
