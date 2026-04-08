import React, { useState } from 'react';
import { Code, Play, Download, FileCode, Eye, Activity, GitBranch, Database, FileText, LineChart } from 'lucide-react';

const TransducerCodeGenerator = () => {
  const [selectedPattern, setSelectedPattern] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('');
  const [selectedAggregator, setSelectedAggregator] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [testSeries, setTestSeries] = useState('4,1,3,1,4,6,1,5,5,2,7,2,3,1,6,1');
  const [executionResult, setExecutionResult] = useState(null);
  const [showTransducer, setShowTransducer] = useState(true);
  const [copied, setCopied] = useState(false);

  const [anomalyMode, setAnomalyMode] = useState(false);
  const [anomalyCriteria, setAnomalyCriteria] = useState([
    { pattern: 'peak', feature: 'height', aggregator: 'max' },
    { pattern: 'peak', feature: 'width', aggregator: 'min' },
  ]);
  const [anomalyCode, setAnomalyCode] = useState('');
  const [anomalyResult, setAnomalyResult] = useState(null);

  const [csvFileName, setCsvFileName] = useState('');
  const [csvColumns, setCsvColumns] = useState([]);
  const [csvRawData, setCsvRawData] = useState(null);
  const [selectedCsvColumn, setSelectedCsvColumn] = useState('');
  const [csvCountries, setCsvCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  
  const [csvDateColumns, setCsvDateColumns] = useState([]);
  const [selectedDateColumn, setSelectedDateColumn] = useState('');
  const [useTimeScale, setUseTimeScale] = useState(false);
  const [timeGranularity, setTimeGranularity] = useState('month'); 
  const [timeLabels, setTimeLabels] = useState([]); 

  const [runResult, setRunResult] = useState(null);

  const resetOutput = () => {
    setGeneratedCode('');
    setExecutionResult(null);
    setRunResult(null);
  };

  const formatDate = (dateStr, granularity) => {
    let parsableDateStr = dateStr;
    if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
      const parts = dateStr.split(/[\/\s:]/);
      if (parts.length >= 3) {
        parsableDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        if (parts.length > 3) parsableDateStr += 'T' + parts.slice(3).join(':');
      }
    }
    
    const d = new Date(parsableDateStr);
    if (isNaN(d.getTime())) return null;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');

    if (granularity === 'year') return `${y}`;
    if (granularity === 'month') return `${y}-${m}`;
    if (granularity === 'day') return `${y}-${m}-${day}`;
    if (granularity === 'hour') return `${y}-${m}-${day} ${h}:00`;
    return `${y}-${m}-${day}`;
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.trim().split('\n');
      if (lines.length < 2) { alert('Fichier CSV vide ou invalide.'); return; }
      const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const sampleSize = Math.min(lines.length, 50);

      const colTypes = header.map((col, idx) => {
        let numCount = 0, dateCount = 0, textCount = 0, emptyCount = 0;
        const uniqueVals = new Set();
        for (let row = 1; row < sampleSize; row++) {
          const cells = lines[row].split(',');
          const raw = cells[idx] ? cells[idx].trim().replace(/"/g, '') : '';
          if (raw === '') { emptyCount++; continue; }
          uniqueVals.add(raw);
          if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(raw) || /^\d{2}[-/]\d{2}[-/]\d{4}/.test(raw) || /^\d{4}-\d{2}-\d{2}T/.test(raw)) dateCount++;
          else if (!isNaN(parseFloat(raw)) && isFinite(Number(raw))) numCount++;
          else textCount++;
        }
        const total = sampleSize - 1 - emptyCount;
        if (total === 0) return { name: col, index: idx, type: 'empty' };
        if (dateCount / total > 0.5) return { name: col, index: idx, type: 'date' };
        if (numCount / total >= 0.5) return { name: col, index: idx, type: 'numeric' };
        if (textCount / total > 0.5 && uniqueVals.size / total < 0.3) return { name: col, index: idx, type: 'category' };
        if (textCount / total > 0.5) return { name: col, index: idx, type: 'text' };
        return { name: col, index: idx, type: 'mixed' };
      });

      const numericCols = colTypes.filter(c => c.type === 'numeric');
      const categoryCols = colTypes.filter(c => c.type === 'category');
      const dateCols = colTypes.filter(c => c.type === 'date');

      let catColIdx = -1;
      let categories = [];
      if (categoryCols.length > 0) {
        catColIdx = categoryCols[0].index;
        const catSet = new Set();
        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(',');
          const cat = cells[catColIdx] ? cells[catColIdx].trim().replace(/"/g, '') : '';
          if (cat) catSet.add(cat);
        }
        categories = [...catSet].sort();
      }
      setCsvCountries(categories);

      if (numericCols.length === 0) {
        alert('Aucune colonne numérique trouvée.');
        return;
      }

      setCsvColumns(numericCols);
      setCsvDateColumns(dateCols);
      
      const initDateCol = dateCols.length > 0 ? dateCols[0].name : '';
      setSelectedDateColumn(initDateCol);

      const defaultCat = categories.includes('France') ? 'France' : categories.length > 0 ? categories[0] : '';
      setSelectedCountry(defaultCat);
      setSelectedCsvColumn(numericCols[0].name);

      const newRawData = { lines, header, catColIdx, catColName: catColIdx !== -1 ? header[catColIdx] : null };
      setCsvRawData(newRawData);

      reloadCsvData({
        colName: numericCols[0].name,
        cat: defaultCat,
        useT: useTimeScale,
        dateCol: initDateCol,
        gran: timeGranularity
      }, newRawData);
    };
    reader.readAsText(file);
  };

  const reloadCsvData = (overrides = {}, explicitRawData = null) => {
    const data = explicitRawData || csvRawData;
    if (!data) return;

    const state = {
      colName: selectedCsvColumn,
      cat: selectedCountry,
      useT: useTimeScale,
      dateCol: selectedDateColumn,
      gran: timeGranularity,
      ...overrides
    };

    const numColIdx = data.header.indexOf(state.colName);
    if (numColIdx === -1) return;

    let values = [];
    let labels = [];

    if (state.useT && state.dateCol) {
      const dateColIdx = data.header.indexOf(state.dateCol);
      if (dateColIdx !== -1) {
        const groups = new Map();
        
        for (let i = 1; i < data.lines.length; i++) {
          const cells = data.lines[i].split(',');
          if (data.catColIdx !== -1 && state.cat) {
            const rowCat = cells[data.catColIdx] ? cells[data.catColIdx].trim().replace(/"/g, '') : '';
            if (rowCat !== state.cat) continue;
          }
          const rawVal = parseFloat(cells[numColIdx] ? cells[numColIdx].trim().replace(/"/g, '') : '');
          if (isNaN(rawVal)) continue;

          const rawDate = cells[dateColIdx] ? cells[dateColIdx].trim().replace(/"/g, '') : '';
          const timeKey = formatDate(rawDate, state.gran);
          if (!timeKey) continue;

          if (!groups.has(timeKey)) groups.set(timeKey, []);
          groups.get(timeKey).push(Math.max(0, Math.round(rawVal)));
        }

        const sortedKeys = Array.from(groups.keys()).sort((a, b) => new Date(a) - new Date(b));
        for (const k of sortedKeys) {
          const arr = groups.get(k);
          const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
          values.push(avg);
          labels.push(k);
        }
      }
    } else {
      for (let i = 1; i < data.lines.length; i++) {
        const cells = data.lines[i].split(',');
        if (data.catColIdx !== -1 && state.cat) {
          const rowCat = cells[data.catColIdx] ? cells[data.catColIdx].trim().replace(/"/g, '') : '';
          if (rowCat !== state.cat) continue;
        }
        const rawVal = parseFloat(cells[numColIdx] ? cells[numColIdx].trim().replace(/"/g, '') : '');
        if (!isNaN(rawVal)) values.push(Math.max(0, Math.round(rawVal)));
      }
    }

    if (values.length < 2) {
      alert("Données insuffisantes (moins de 2 points) pour ces critères/cette granularité temporelle.");
      return;
    }

    setTestSeries(values.join(','));
    setTimeLabels(labels);
    resetOutput();
  };

  const handleColumnChange = (colName) => { setSelectedCsvColumn(colName); reloadCsvData({ colName }); };
  const handleCountryChange = (cat) => { setSelectedCountry(cat); reloadCsvData({ cat }); };
  const handleUseTimeChange = (useT) => { setUseTimeScale(useT); reloadCsvData({ useT }); };
  const handleDateColChange = (dateCol) => { setSelectedDateColumn(dateCol); reloadCsvData({ dateCol }); };
  const handleGranularityChange = (gran) => { setTimeGranularity(gran); reloadCsvData({ gran }); };

  const executeInBrowser = () => {
    if (!selectedPattern || !selectedFeature || !selectedAggregator) {
      alert('Erreur: Paramètres incomplets (Pattern, Feature, Aggregator requis).');
      return;
    }
    const values = testSeries.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
    if (values.length < 2) { alert('Série temporelle insuffisante (< 2 valeurs).'); return; }
    
    const transducer = transducers[selectedPattern];
    const feature = featureFunctions[selectedFeature];

    const sig = [];
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i] < values[i + 1]) sig.push('<');
      else if (values[i] === values[i + 1]) sig.push('=');
      else sig.push('>');
    }

    const aggNeutral = selectedAggregator === 'min' ? Infinity : selectedAggregator === 'max' ? -Infinity : 0;
    const featNeutral = feature.neutral === 'Infinity' ? Infinity : feature.neutral === '-Infinity' ? -Infinity : Number(feature.neutral);
    
    const phiFn = (acc, val) => {
      if (selectedFeature === 'width' || selectedFeature === 'surface') return acc + val;
      if (selectedFeature === 'max') return Math.max(acc, val);
      if (selectedFeature === 'min') return Math.min(acc, val);
      if (selectedFeature === 'height') return Math.max(acc, val);
      return acc + val;
    };
    
    const aggFn = (r, c) => {
      if (selectedAggregator === 'min') return Math.min(r, c);
      if (selectedAggregator === 'max') return Math.max(r, c);
      return r + c;
    };

    let R = aggNeutral, C = featNeutral, D = featNeutral;
    let hasCurrent = false;
    let state = transducer.states.find(s => s.initial).name;
    const positions = [];
    let currentOcc = [];
    let pendingAfter = [];
    const allOccurrences = [];

    for (let i = 0; i < sig.length; i++) {
      const s = sig[i];
      let sem = null;

      for (let ti = 0; ti < transducer.transitions.length; ti++) {
        const t = transducer.transitions[ti];
        let match = false;
        if (t.input === '≥') match = (s === '>' || s === '=');
        else if (t.input === '≤') match = (s === '<' || s === '=');
        else if (t.input === '≠<') match = (s === '>' || s === '=');
        else if (t.input === '≠') match = (s !== '=');
        else match = (s === t.input);
        if (state === t.from && match) {
          sem = t.output; state = t.to; break;
        }
      }

      const delta = feature.delta === 1 ? 1 : values[i];

      if (sem === 'out') { }
      else if (sem === 'outr') {
        D = featNeutral; currentOcc = []; pendingAfter = []; hasCurrent = false;
      } else if (sem === 'outa') {
        if (hasCurrent) {
          R = aggFn(R, C);
          const occVals = currentOcc.map(j => values[j]);
          allOccurrences.push({
            indices: [...currentOcc], values: occVals,
            width: currentOcc.length,
            height: occVals.length > 0 ? Math.max(...occVals) - Math.min(...occVals) : 0,
            surface: occVals.reduce((a, b) => a + b, 0),
            max: occVals.length > 0 ? Math.max(...occVals) : 0,
            min: occVals.length > 0 ? Math.min(...occVals) : 0,
            featureValue: C,
          });
        }
        C = featNeutral; D = featNeutral; hasCurrent = false;
        if (currentOcc.length > 0) positions.push([...currentOcc]);
        currentOcc = []; pendingAfter = [];
      } else if (sem === 'maybeb') {
        D = phiFn(D, delta); currentOcc.push(i);
      } else if (sem === 'maybea') {
        D = phiFn(D, delta); pendingAfter.push(i);
      } else if (sem === 'found') {
        C = phiFn(D, delta); D = featNeutral; hasCurrent = true;
        currentOcc.push(i); pendingAfter = [];
      } else if (sem === 'founde') {
        R = aggFn(R, phiFn(D, delta)); D = featNeutral;
        currentOcc.push(i);
        const occVals = currentOcc.map(j => values[j]);
        allOccurrences.push({
          indices: [...currentOcc], values: occVals,
          width: currentOcc.length,
          height: occVals.length > 0 ? Math.max(...occVals) - Math.min(...occVals) : 0,
          surface: occVals.reduce((a, b) => a + b, 0),
          max: occVals.length > 0 ? Math.max(...occVals) : 0,
          min: occVals.length > 0 ? Math.min(...occVals) : 0,
          featureValue: phiFn(D, delta),
        });
        positions.push([...currentOcc]);
        currentOcc = []; pendingAfter = []; hasCurrent = false;
      } else if (sem === 'in') {
        C = phiFn(C, phiFn(D, delta)); D = featNeutral;
        currentOcc.push(...pendingAfter); pendingAfter = [];
        currentOcc.push(i);
      }
    }

    if (hasCurrent) {
      R = aggFn(R, C);
      const occVals = currentOcc.map(j => values[j]);
      allOccurrences.push({
        indices: [...currentOcc], values: occVals,
        width: currentOcc.length,
        height: occVals.length > 0 ? Math.max(...occVals) - Math.min(...occVals) : 0,
        surface: occVals.reduce((a, b) => a + b, 0),
        max: occVals.length > 0 ? Math.max(...occVals) : 0,
        min: occVals.length > 0 ? Math.min(...occVals) : 0,
        featureValue: C,
      });
      positions.push([...currentOcc]);
    }

    setRunResult({
      aggregatedValue: R,
      occurrences: allOccurrences,
      totalPoints: values.length,
      signatureLength: sig.length,
      constraint: `${selectedAggregator}_${selectedFeature}_${selectedPattern}`,
    });
  };

  const transducers = {
    peak: {
      name: 'peak', regex: '< (= | <)* (> | =)* >', description: 'Détecte les pics : montée puis descente',
      states: [
        { name: 'd', initial: true, label: 'Outside' },
        { name: 'r', initial: false, label: 'Rising' },
        { name: 't', initial: false, label: 'Top/Falling' }
      ],
      transitions: [
        { from: 'd', to: 'd', input: '≥', output: 'out', label: '≥ : out' },
        { from: 'd', to: 'r', input: '<', output: 'out', label: '< : out' },
        { from: 'r', to: 'r', input: '≤', output: 'maybeb', label: '≤ : maybe_before' },
        { from: 'r', to: 't', input: '>', output: 'found', label: '> : found' },
        { from: 't', to: 't', input: '>', output: 'in', label: '> : in' },
        { from: 't', to: 't', input: '=', output: 'maybea', label: '= : maybe_after' },
        { from: 't', to: 'r', input: '<', output: 'outa', label: '< : out_after' }
      ],
      attributes: { before: 1, after: 1 }
    },
    valley: {
      name: 'valley', regex: '> (= | >)* (< | =)* <', description: 'Détecte les vallées : descente puis montée',
      states: [
        { name: 'd', initial: true, label: 'Outside' },
        { name: 'r', initial: false, label: 'Falling' },
        { name: 't', initial: false, label: 'Bottom/Rising' }
      ],
      transitions: [
        { from: 'd', to: 'd', input: '≤', output: 'out', label: '≤ : out' },
        { from: 'd', to: 'r', input: '>', output: 'out', label: '> : out' },
        { from: 'r', to: 'r', input: '≥', output: 'maybeb', label: '≥ : maybe_before' },
        { from: 'r', to: 't', input: '<', output: 'found', label: '< : found' },
        { from: 't', to: 't', input: '<', output: 'in', label: '< : in' },
        { from: 't', to: 't', input: '=', output: 'maybea', label: '= : maybe_after' },
        { from: 't', to: 'r', input: '>', output: 'outa', label: '> : out_after' }
      ],
      attributes: { before: 1, after: 1 }
    },
    zigzag: {
      name: 'zigzag', regex: '(<>)+(< | <>)', description: 'Détecte les zigzags : alternance montée/descente',
      states: [
        { name: 'd', initial: true, label: 'Outside' },
        { name: 'u', initial: false, label: 'Up' },
        { name: 'down', initial: false, label: 'Down' }
      ],
      transitions: [
        { from: 'd', to: 'd', input: '=', output: 'out', label: '= : out' },
        { from: 'd', to: 'u', input: '<', output: 'maybeb', label: '< : maybe_before' },
        { from: 'd', to: 'down', input: '>', output: 'maybeb', label: '> : maybe_before' },
        { from: 'u', to: 'down', input: '>', output: 'found', label: '> : found' },
        { from: 'down', to: 'u', input: '<', output: 'in', label: '< : in' },
        { from: 'u', to: 'd', input: '=', output: 'outr', label: '= : out_reset' },
        { from: 'down', to: 'd', input: '=', output: 'outr', label: '= : out_reset' },
        { from: 'u', to: 'u', input: '<', output: 'outr', label: '< : out_reset' },
        { from: 'down', to: 'down', input: '>', output: 'outr', label: '> : out_reset' }
      ],
      attributes: { before: 1, after: 1 }
    },
    plateau: {
      name: 'plateau', regex: '<=*>', description: 'Détecte les plateaux : montée, palier, descente',
      states: [
        { name: 'd', initial: true, label: 'Outside' },
        { name: 'r', initial: false, label: 'Rising' },
        { name: 'p', initial: false, label: 'Plateau' }
      ],
      transitions: [
        { from: 'd', to: 'd', input: '≠<', output: 'out', label: '≠< : out' },
        { from: 'd', to: 'r', input: '<', output: 'maybeb', label: '< : maybe_before' },
        { from: 'r', to: 'p', input: '=', output: 'maybeb', label: '= : maybe_before' },
        { from: 'r', to: 'd', input: '<', output: 'outr', label: '< : out_reset' },
        { from: 'r', to: 'd', input: '>', output: 'outr', label: '> : out_reset' },
        { from: 'p', to: 'p', input: '=', output: 'maybeb', label: '= : maybe_before' },
        { from: 'p', to: 'd', input: '>', output: 'found', label: '> : found' },
        { from: 'p', to: 'd', input: '<', output: 'outr', label: '< : out_reset' }
      ],
      attributes: { before: 1, after: 1 }
    },
    proper_plateau: {
      name: 'proper_plateau', regex: '<=+>', description: 'Détecte les plateaux propres (avec palier non vide)',
      states: [
        { name: 'd', initial: true, label: 'Outside' },
        { name: 'r', initial: false, label: 'Rising' },
        { name: 'p', initial: false, label: 'Plateau' },
        { name: 'f', initial: false, label: 'Found' }
      ],
      transitions: [
        { from: 'd', to: 'd', input: '≠<', output: 'out', label: '≠< : out' },
        { from: 'd', to: 'r', input: '<', output: 'maybeb', label: '< : maybe_before' },
        { from: 'r', to: 'p', input: '=', output: 'maybeb', label: '= : maybe_before' },
        { from: 'p', to: 'p', input: '=', output: 'maybeb', label: '= : maybe_before' },
        { from: 'p', to: 'f', input: '>', output: 'found', label: '> : found' },
        { from: 'f', to: 'd', input: '', output: 'out', label: 'ε : out' }
      ],
      attributes: { before: 1, after: 1 }
    },
    inflexion: {
      name: 'inflexion', regex: '< (< | =)* > | > (> | =)* <', description: 'Détecte les points d\'inflexion',
      states: [
        { name: 'd', initial: true, label: 'Outside' },
        { name: 'inc', initial: false, label: 'Increasing' },
        { name: 'dec', initial: false, label: 'Decreasing' }
      ],
      transitions: [
        { from: 'd', to: 'd', input: '=', output: 'out', label: '= : out' },
        { from: 'd', to: 'inc', input: '<', output: 'maybeb', label: '< : maybe_before' },
        { from: 'd', to: 'dec', input: '>', output: 'maybeb', label: '> : maybe_before' },
        { from: 'inc', to: 'inc', input: '≤', output: 'maybeb', label: '≤ : maybe_before' },
        { from: 'inc', to: 'd', input: '>', output: 'found', label: '> : found' },
        { from: 'dec', to: 'dec', input: '≥', output: 'maybeb', label: '≥ : maybe_before' },
        { from: 'dec', to: 'd', input: '<', output: 'found', label: '< : found' }
      ],
      attributes: { before: 1, after: 1 }
    },
    increasing: {
      name: 'increasing', regex: '<', description: 'Détecte une augmentation simple',
      states: [{ name: 'd', initial: true, label: 'Start' }],
      transitions: [
        { from: 'd', to: 'd', input: '<', output: 'found', label: '< : found' },
        { from: 'd', to: 'd', input: '≥', output: 'out', label: '≥ : out' }
      ],
      attributes: { before: 0, after: 0 }
    },
    decreasing: {
      name: 'decreasing', regex: '>', description: 'Détecte une diminution simple',
      states: [{ name: 'd', initial: true, label: 'Start' }],
      transitions: [
        { from: 'd', to: 'd', input: '>', output: 'found', label: '> : found' },
        { from: 'd', to: 'd', input: '≤', output: 'out', label: '≤ : out' }
      ],
      attributes: { before: 0, after: 0 }
    },
    steady: {
      name: 'steady', regex: '=', description: 'Détecte une égalité',
      states: [{ name: 'd', initial: true, label: 'Start' }],
      transitions: [
        { from: 'd', to: 'd', input: '=', output: 'found', label: '= : found' },
        { from: 'd', to: 'd', input: '≠', output: 'out', label: '≠ : out' }
      ],
      attributes: { before: 0, after: 0 }
    },
    increasing_sequence: {
      name: 'increasing_sequence', regex: '< (< | =)* <', description: 'Détecte une séquence croissante',
      states: [
        { name: 'd', initial: true, label: 'Outside' },
        { name: 'r', initial: false, label: 'Rising' }
      ],
      transitions: [
        { from: 'd', to: 'd', input: '≥', output: 'out', label: '≥ : out' },
        { from: 'd', to: 'r', input: '<', output: 'maybeb', label: '< : maybe_before' },
        { from: 'r', to: 'r', input: '≤', output: 'maybeb', label: '≤ : maybe_before' },
        { from: 'r', to: 'r', input: '<', output: 'found', label: '< : found' },
        { from: 'r', to: 'd', input: '>', output: 'outr', label: '> : out_reset' }
      ],
      attributes: { before: 0, after: 0 }
    },
    decreasing_sequence: {
      name: 'decreasing_sequence', regex: '> (> | =)* >', description: 'Détecte une séquence décroissante',
      states: [
        { name: 'd', initial: true, label: 'Outside' },
        { name: 'f', initial: false, label: 'Falling' }
      ],
      transitions: [
        { from: 'd', to: 'd', input: '≤', output: 'out', label: '≤ : out' },
        { from: 'd', to: 'f', input: '>', output: 'maybeb', label: '> : maybe_before' },
        { from: 'f', to: 'f', input: '≥', output: 'maybeb', label: '≥ : maybe_before' },
        { from: 'f', to: 'f', input: '>', output: 'found', label: '> : found' },
        { from: 'f', to: 'd', input: '<', output: 'outr', label: '< : out_reset' }
      ],
      attributes: { before: 0, after: 0 }
    },
    summit: {
      name: 'summit', regex: '(< | (< (= | <)* <)) (> | (> (= | >)* >))', description: 'Détecte un sommet (pic strict)',
      states: [
        { name: 'd', initial: true, label: 'Outside' },
        { name: 'r', initial: false, label: 'Rising' },
        { name: 't', initial: false, label: 'Top' }
      ],
      transitions: [
        { from: 'd', to: 'd', input: '≥', output: 'out', label: '≥ : out' },
        { from: 'd', to: 'r', input: '<', output: 'maybeb', label: '< : maybe_before' },
        { from: 'r', to: 'r', input: '≤', output: 'maybeb', label: '≤ : maybe_before' },
        { from: 'r', to: 't', input: '>', output: 'maybeb', label: '> : maybe_before' },
        { from: 't', to: 't', input: '≥', output: 'maybeb', label: '≥ : maybe_before' },
        { from: 't', to: 'd', input: '<', output: 'found', label: '< : found' },
        { from: 'r', to: 'd', input: '<', output: 'outr', label: '< : out_reset' }
      ],
      attributes: { before: 1, after: 1 }
    }
  };

  const featureFunctions = {
    width: { neutral: 0, phi: (acc, val) => `${acc} + ${val}`, delta: 1, description: 'Compte le nombre d\'éléments' },
    height: { neutral: 0, phi: (acc, val) => `max(${acc}, ${val})`, delta: 'values[i]', description: 'Range (max - min) des valeurs' },
    surface: { neutral: 0, phi: (acc, val) => `${acc} + ${val}`, delta: 'values[i]', description: 'Somme des valeurs' },
    min: { neutral: 'Infinity', phi: (acc, val) => `min(${acc}, ${val})`, delta: 'values[i]', description: 'Valeur minimale' },
    max: { neutral: '-Infinity', phi: (acc, val) => `max(${acc}, ${val})`, delta: 'values[i]', description: 'Valeur maximale' }
  };

  const generatePythonCode = (transducer, feature) => {
    const funcName = `${selectedAggregator}_${selectedFeature}_${selectedPattern}`;
    const minDefault = selectedAggregator === 'min' ? 'float("inf")' : selectedAggregator === 'max' ? 'float("-inf")' : '0';
    const phiLogic = selectedFeature === 'width' ? 'return acc + val' :
                     selectedFeature === 'height' ? 'return max(acc, val) if acc != 0 else val' :
                     selectedFeature === 'surface' ? 'return acc + val' :
                     selectedFeature === 'min' ? 'return min(acc, val) if acc != float("inf") else val' :
                     'return max(acc, val) if acc != float("-inf") else val';

    const aggregateLogic = selectedAggregator === 'min' ? 'return min(r, c)' :
                          selectedAggregator === 'max' ? 'return max(r, c)' :
                          'return r + c';

    const transitionsCode = transducer.transitions.map((t, idx) => {
      const inputCondition = t.input === '≥' ? "s in ['>', '=']" :
                            t.input === '≤' ? "s in ['<', '=']" :
                            t.input === '≠<' ? "s in ['>', '=']" :
                            t.input === '≠' ? "s != '='" :
                            `s == '${t.input}'`;
      const keyword = idx === 0 ? 'if' : 'elif';
      return `        ${keyword} state == '${t.from}' and ${inputCondition}:
            semantic_output = '${t.output}'
            state = '${t.to}'`;
    }).join('\n');

    const featureNeutralPy = feature.neutral === 'Infinity' ? 'float("inf")' :
                             feature.neutral === '-Infinity' ? 'float("-inf")' :
                             String(feature.neutral);

    return `def signature(values):
    """Calcule la signature (<, =, >) de la série temporelle"""
    sig = []
    for i in range(len(values) - 1):
        if values[i] < values[i + 1]:
            sig.append('<')
        elif values[i] == values[i + 1]:
            sig.append('=')
        else:
            sig.append('>')
    return sig

def ${funcName}(values):
    """
    Code généré automatiquement depuis le transducteur

    Pattern: ${selectedPattern} (${transducer.description})
    Feature: ${selectedFeature} (${featureFunctions[selectedFeature].description})
    Agrégateur: ${selectedAggregator}

    Transducteur:
      États: ${transducer.states.map(s => s.name).join(', ')}
      Transitions: ${transducer.transitions.length}
      Regex: ${transducer.regex}
    """
    if len(values) < 2:
        return ${minDefault}, []

    sig = signature(values)

    R = ${minDefault}  # Résultat agrégé (valeur neutre de l'agrégateur)
    C = ${featureNeutralPy}  # Feature courant
    D = ${featureNeutralPy}  # Feature potentiel
    has_current = False

    def phi(acc, val):
        ${phiLogic}

    def aggregate(r, c):
        ${aggregateLogic}

    positions = []
    current_occurrence = []
    pending_after = []

    state = '${transducer.states.find(s => s.initial).name}'

    for i, s in enumerate(sig):
        semantic_output = None

${transitionsCode}

        if semantic_output == 'out':
            pass

        elif semantic_output == 'outr':
            D = ${featureNeutralPy}
            current_occurrence = []
            pending_after = []
            has_current = False

        elif semantic_output == 'outa':
            if has_current:
                R = aggregate(R, C)
            C = ${featureNeutralPy}
            D = ${featureNeutralPy}
            has_current = False
            if current_occurrence:
                positions.append(list(current_occurrence))
                current_occurrence = []
            pending_after = []

        elif semantic_output == 'maybeb':
            D = phi(D, ${feature.delta === 1 ? '1' : 'values[i]'})
            current_occurrence.append(i)

        elif semantic_output == 'maybea':
            D = phi(D, ${feature.delta === 1 ? '1' : 'values[i]'})
            pending_after.append(i)

        elif semantic_output == 'found':
            C = phi(D, ${feature.delta === 1 ? '1' : 'values[i]'})
            D = ${featureNeutralPy}
            has_current = True
            current_occurrence.append(i)
            pending_after = []

        elif semantic_output == 'founde':
            R = aggregate(R, phi(D, ${feature.delta === 1 ? '1' : 'values[i]'}))
            D = ${featureNeutralPy}
            current_occurrence.append(i)
            if current_occurrence:
                positions.append(list(current_occurrence))
                current_occurrence = []
            pending_after = []
            has_current = False

        elif semantic_output == 'in':
            C = phi(C, phi(D, ${feature.delta === 1 ? '1' : 'values[i]'}))
            D = ${featureNeutralPy}
            current_occurrence.extend(pending_after)
            pending_after = []
            current_occurrence.append(i)

    if has_current:
        R = aggregate(R, C)
    if current_occurrence:
        positions.append(list(current_occurrence))

    return R, positions

if __name__ == "__main__":
    values = [${testSeries}]
    result, positions = ${funcName}(values)

    print("=" * 60)
    print("RÉSULTATS - Pattern: ${selectedPattern}")
    print("=" * 60)
    print(f"${funcName.upper()} = {result}")
    print(f"Occurrences trouvées: {len(positions)}")
    print()
    for i, pos in enumerate(positions):
        print(f"  Occurrence #{i+1}:")
        print(f"    Indices: {pos}")
        print(f"    Valeurs: {[values[j] for j in pos]}")
        print()
`;
  };

  const generateCode = () => {
    const transducer = transducers[selectedPattern];
    const feature = featureFunctions[selectedFeature];
    if (targetLanguage === 'python') return generatePythonCode(transducer, feature);
    return "// Définition formelle (Java/C) non disponible dans ce contexte.";
  };

  const handleGenerate = () => {
    const code = generateCode();
    setGeneratedCode(code);
    setExecutionResult({
      message: 'Code source de la contrainte synthétisé avec succès.',
      transducer: selectedPattern,
      states: transducers[selectedPattern].states.length,
      transitions: transducers[selectedPattern].transitions.length
    });
  };

  const handleGenerateAnomaly = () => {
    const pythonCode = `# Générateur d'Anomalies Multi-Critères
# Critères évalués :
${anomalyCriteria.map((c, i) => `# C${i+1} : ${c.aggregator} ${c.feature} pour le pattern ${c.pattern}`).join('\n')}

def detect_anomalies(values):
    # L'implémentation complète nécessiterait l'assemblage de plusieurs transducteurs
    # Utilisez l'interface Web pour l'évaluation empirique.
    pass

if __name__ == "__main__":
    print("Script de détection généré (stub).")
`;
    setAnomalyCode(pythonCode);
  };

  const addCriterion = () => {
    setAnomalyCriteria([...anomalyCriteria, { pattern: 'peak', feature: 'width', aggregator: 'min' }]);
  };

  const removeCriterion = (index) => {
    setAnomalyCriteria(anomalyCriteria.filter((_, i) => i !== index));
  };

  const updateCriterion = (index, field, value) => {
    const updated = [...anomalyCriteria];
    updated[index] = { ...updated[index], [field]: value };
    setAnomalyCriteria(updated);
  };

  const executeAnomalyInBrowser = () => {
    const values = testSeries.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
    if (values.length < 2) { alert('Taille de la série insuffisante.'); return; }
    const sig = [];
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i] < values[i + 1]) sig.push('<');
      else if (values[i] === values[i + 1]) sig.push('=');
      else sig.push('>');
    }
    const patternResults = {};
    const usedPatterns = [...new Set(anomalyCriteria.map(c => c.pattern))];
    for (const patName of usedPatterns) {
      const td = transducers[patName];
      if (!td) continue;
      let st = td.states.find(s => s.initial).name;
      const occs = [];
      let cur = [], pend = [], has = false;
      for (let i = 0; i < sig.length; i++) {
        let sem = null;
        for (const t of td.transitions) {
          let m = false;
          if (t.input === '\u2265') m = (sig[i] === '>' || sig[i] === '=');
          else if (t.input === '\u2264') m = (sig[i] === '<' || sig[i] === '=');
          else if (t.input === '\u2260<') m = (sig[i] === '>' || sig[i] === '=');
          else if (t.input === '\u2260') m = (sig[i] !== '=');
          else m = (sig[i] === t.input);
          if (st === t.from && m) { sem = t.output; st = t.to; break; }
        }
        if (sem === 'outr') { cur = []; pend = []; has = false; }
        else if (sem === 'outa') {
          if (has && cur.length > 0) {
            const ov = cur.map(j => values[j]);
            occs.push({ indices: [...cur], width: cur.length, height: Math.max(...ov) - Math.min(...ov), surface: ov.reduce((a,b)=>a+b,0), max: Math.max(...ov), min: Math.min(...ov) });
          }
          cur = []; pend = []; has = false;
        } else if (sem === 'maybeb') { cur.push(i); }
        else if (sem === 'maybea') { pend.push(i); }
        else if (sem === 'found') { has = true; cur.push(i); pend = []; }
        else if (sem === 'founde') {
          cur.push(i);
          const ov = cur.map(j => values[j]);
          occs.push({ indices: [...cur], width: cur.length, height: Math.max(...ov) - Math.min(...ov), surface: ov.reduce((a,b)=>a+b,0), max: Math.max(...ov), min: Math.min(...ov) });
          cur = []; pend = []; has = false;
        } else if (sem === 'in') { cur.push(...pend); pend = []; cur.push(i); }
      }
      if (has && cur.length > 0) {
        const ov = cur.map(j => values[j]);
        occs.push({ indices: [...cur], width: cur.length, height: Math.max(...ov) - Math.min(...ov), surface: ov.reduce((a,b)=>a+b,0), max: Math.max(...ov), min: Math.min(...ov) });
      }
      patternResults[patName] = occs;
    }
    const constraints = anomalyCriteria.map(c => {
      const occs = patternResults[c.pattern] || [];
      if (occs.length === 0) return { ...c, value: null, name: `${c.aggregator}_${c.feature}_${c.pattern}` };
      const vals = occs.map(o => o[c.feature]);
      const val = c.aggregator === 'max' ? Math.max(...vals) : Math.min(...vals);
      return { ...c, value: val, name: `${c.aggregator}_${c.feature}_${c.pattern}` };
    });
    const strictByPat = {};
    for (const c of constraints) {
      if (c.value === null) continue;
      const occs = patternResults[c.pattern];
      const vals = occs.map(o => o[c.feature]);
      const target = c.aggregator === 'max' ? Math.max(...vals) : Math.min(...vals);
      const es = new Set(); vals.forEach((v, i) => { if (v === target) es.add(i); });
      strictByPat[c.pattern] = strictByPat[c.pattern] ? new Set([...strictByPat[c.pattern]].filter(i => es.has(i))) : es;
    }
    const strictAnomalies = [];
    for (const [pat, idxSet] of Object.entries(strictByPat)) {
      for (const idx of idxSet) strictAnomalies.push({ pattern: pat, index: idx, occurrence: patternResults[pat][idx] });
    }
    const scored = [];
    for (const pat of usedPatterns) {
      const occs = patternResults[pat] || [];
      if (occs.length < 2) continue;
      const pc = anomalyCriteria.filter(c => c.pattern === pat);
      for (let oi = 0; oi < occs.length; oi++) {
        let score = 0;
        for (const c of pc) {
          const vals = occs.map(o => o[c.feature]);
          const mean = vals.reduce((a,b)=>a+b,0) / vals.length;
          const std = Math.sqrt(vals.reduce((a,v)=>a+(v-mean)**2,0) / vals.length);
          if (std === 0) continue;
          const z = (occs[oi][c.feature] - mean) / std;
          score += c.aggregator === 'max' ? z : -z;
        }
        scored.push({ pattern: pat, index: oi, occurrence: occs[oi], score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    setAnomalyResult({ patternResults, constraints, strictAnomalies, scored, totalPoints: values.length });
  };

  const renderAnomalyChart = () => {
    if (!anomalyResult) return null;
    const values = testSeries.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
    if (values.length < 2) return null;
    
    const W = 900, H = 320, PAD_X = 40, PAD_TOP = 40, PAD_BOTTOM = 60;
    const cW = W - PAD_X * 2, cH = H - PAD_TOP - PAD_BOTTOM;
    const mx = Math.max(...values), mn = Math.min(...values), rng = mx - mn || 1;
    
    const xS = (i) => PAD_X + (i / (values.length - 1)) * cW;
    const yS = (v) => PAD_TOP + cH - ((v - mn) / rng) * cH;
    const lp = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xS(i).toFixed(1)} ${yS(v).toFixed(1)}`).join(' ');
    
    const allO = [];
    for (const [pat, occs] of Object.entries(anomalyResult.patternResults)) {
      occs.forEach((occ, idx) => {
        const isSt = anomalyResult.strictAnomalies.some(a => a.pattern === pat && a.index === idx);
        allO.push({ ...occ, isAnomaly: isSt });
      });
    }

    const numXTicks = Math.min(10, values.length);
    const xTicks = [...new Set(Array.from({ length: numXTicks }, (_, i) => Math.floor(i * (values.length - 1) / (numXTicks - 1))))];

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-white border border-slate-300" style={{ maxHeight: '350px' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <g key={`y-${f}`}>
            <line x1={PAD_X} y1={PAD_TOP + cH - f * cH} x2={W - PAD_X} y2={PAD_TOP + cH - f * cH} stroke="#e2e8f0" strokeWidth="0.5" />
            <text x={PAD_X - 8} y={PAD_TOP + cH - f * cH + 3} textAnchor="end" fontSize="10" fill="#475569" fontFamily="monospace">
              {Math.round(mn + f * rng)}
            </text>
          </g>
        ))}

        {allO.map((o, i) => {
          const sx = xS(o.indices[0]), ex = xS(o.indices[o.indices.length - 1]);
          return (
            <rect key={`z${i}`} x={sx} y={PAD_TOP} width={Math.max(ex - sx, 1)} height={cH} 
                  fill={o.isAnomaly ? 'rgba(153, 27, 27, 0.1)' : 'rgba(30, 64, 175, 0.05)'} 
                  stroke={o.isAnomaly ? '#991b1b' : '#1e40af'} 
                  strokeWidth={o.isAnomaly ? 1 : 0.5} 
                  strokeDasharray={o.isAnomaly ? '' : '2,2'} />
          );
        })}

        <path d={lp} fill="none" stroke="#1f77b4" strokeWidth="1" />
        
        {allO.filter(o => o.isAnomaly).map((o, i) => {
          const pi = o.indices[Math.floor(o.indices.length / 2)];
          return (
            <g key={`m${i}`}>
              <circle cx={xS(pi)} cy={yS(values[pi])} r="3" fill="#991b1b" stroke="#fff" strokeWidth="0.5" />
              <text x={xS(pi)} y={yS(values[pi]) - 8} textAnchor="middle" fontSize="9" fill="#991b1b" fontFamily="serif">Anomalie</text>
            </g>
          );
        })}

        <line x1={PAD_X} y1={H - PAD_BOTTOM} x2={W - PAD_X} y2={H - PAD_BOTTOM} stroke="#334155" strokeWidth="1" />
        <line x1={PAD_X} y1={PAD_TOP} x2={PAD_X} y2={H - PAD_BOTTOM} stroke="#334155" strokeWidth="1" />
        
        {xTicks.map(tick => (
          <g key={`x-tick-${tick}`}>
            <line x1={xS(tick)} y1={H - PAD_BOTTOM} x2={xS(tick)} y2={H - PAD_BOTTOM + 5} stroke="#334155" strokeWidth="1" />
            <text x={xS(tick)} y={H - PAD_BOTTOM + 16} textAnchor="middle" fontSize="10" fill="#475569" fontFamily="monospace">
              {useTimeScale && timeLabels.length > tick ? timeLabels[tick] : tick}
            </text>
          </g>
        ))}

        <text x={W / 2} y={H - 15} textAnchor="middle" fontSize="11" fill="#475569" fontFamily="serif">
          {useTimeScale && timeLabels.length > 0 ? `Temps (${timeGranularity}) (n=${values.length})` : `Index Temporel (n=${values.length})`}
        </text>
      </svg>
    );
  };

  const renderChart = () => {
    if (!runResult || runResult.occurrences.length === 0) return null;
    const values = testSeries.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
    if (values.length < 2) return null;

    const W = 900, H = 320, PAD_X = 40, PAD_TOP = 40, PAD_BOTTOM = 60;
    const chartW = W - PAD_X * 2, chartH = H - PAD_TOP - PAD_BOTTOM;
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const range = maxVal - minVal || 1;

    const xScale = (i) => PAD_X + (i / (values.length - 1)) * chartW;
    const yScale = (v) => PAD_TOP + chartH - ((v - minVal) / range) * chartH;
    const linePath = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(v).toFixed(1)}`).join(' ');

    const allFeatVals = runResult.occurrences.map(o => o[selectedFeature]);
    const extremeVal = selectedAggregator === 'min' ? Math.min(...allFeatVals) : selectedAggregator === 'max' ? Math.max(...allFeatVals) : null;

    const numXTicks = Math.min(10, values.length);
    const xTicks = [...new Set(Array.from({ length: numXTicks }, (_, i) => Math.floor(i * (values.length - 1) / (numXTicks - 1))))];

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-white border border-slate-300" style={{ maxHeight: '350px' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const y = PAD_TOP + chartH - f * chartH;
          return (
            <g key={`y-${f}`}>
              <line x1={PAD_X} y1={y} x2={W - PAD_X} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
              <text x={PAD_X - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#475569" fontFamily="monospace">{Math.round(minVal + f * range)}</text>
            </g>
          );
        })}

        {runResult.occurrences.map((occ, idx) => {
          const isExtreme = occ[selectedFeature] === extremeVal;
          const startX = xScale(occ.indices[0]);
          const endX = xScale(occ.indices[occ.indices.length - 1]);
          return (
            <rect key={`zone-${idx}`}
              x={startX} y={PAD_TOP} width={Math.max(endX - startX, 1)} height={chartH}
              fill={isExtreme ? 'rgba(153, 27, 27, 0.1)' : 'rgba(30, 64, 175, 0.05)'}
              stroke={isExtreme ? '#991b1b' : '#1e40af'}
              strokeWidth={isExtreme ? 1 : 0.5}
              strokeDasharray={isExtreme ? '' : '2,2'}
            />
          );
        })}

        <path d={linePath} fill="none" stroke="#1f77b4" strokeWidth="1" />
        
        <line x1={PAD_X} y1={H - PAD_BOTTOM} x2={W - PAD_X} y2={H - PAD_BOTTOM} stroke="#334155" strokeWidth="1" />
        <line x1={PAD_X} y1={PAD_TOP} x2={PAD_X} y2={H - PAD_BOTTOM} stroke="#334155" strokeWidth="1" />
        
        {xTicks.map(tick => (
          <g key={`x-tick-${tick}`}>
            <line x1={xScale(tick)} y1={H - PAD_BOTTOM} x2={xScale(tick)} y2={H - PAD_BOTTOM + 5} stroke="#334155" strokeWidth="1" />
            <text x={xScale(tick)} y={H - PAD_BOTTOM + 16} textAnchor="middle" fontSize="10" fill="#475569" fontFamily="monospace">
              {useTimeScale && timeLabels.length > tick ? timeLabels[tick] : tick}
            </text>
          </g>
        ))}

        <text x={W / 2} y={H - 15} textAnchor="middle" fontSize="11" fill="#475569" fontFamily="serif">
          {useTimeScale && timeLabels.length > 0 ? `Temps (${timeGranularity}) (n=${values.length})` : `Index Temporel (n=${values.length})`}
        </text>
      </svg>
    );
  };

  // NOUVELLE FONCTION : Affichage de l'aperçu instantané de la série
  const renderPreviewChart = () => {
    if (!testSeries) return null;
    const values = testSeries.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
    if (values.length < 2) {
      return (
        <div className="mt-4 p-6 border border-slate-200 bg-slate-50 text-center text-slate-500 font-serif text-sm italic">
          Veuillez renseigner au moins 2 valeurs valides pour visualiser l'aperçu de la série temporelle.
        </div>
      );
    }

    const W = 900, H = 320, PAD_X = 40, PAD_TOP = 40, PAD_BOTTOM = 60;
    const chartW = W - PAD_X * 2, chartH = H - PAD_TOP - PAD_BOTTOM;
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const range = maxVal - minVal || 1;

    const xScale = (i) => PAD_X + (i / (values.length - 1)) * chartW;
    const yScale = (v) => PAD_TOP + chartH - ((v - minVal) / range) * chartH;
    const linePath = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(v).toFixed(1)}`).join(' ');

    const numXTicks = Math.min(10, values.length);
    const xTicks = [...new Set(Array.from({ length: numXTicks }, (_, i) => Math.floor(i * (values.length - 1) / (numXTicks - 1))))];

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-white border border-slate-300 mt-4" style={{ maxHeight: '350px' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const y = PAD_TOP + chartH - f * chartH;
          return (
            <g key={`y-${f}`}>
              <line x1={PAD_X} y1={y} x2={W - PAD_X} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
              <text x={PAD_X - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#475569" fontFamily="monospace">{Math.round(minVal + f * range)}</text>
            </g>
          );
        })}

        <path d={linePath} fill="none" stroke="#1f77b4" strokeWidth="1.5" />
        
        <line x1={PAD_X} y1={H - PAD_BOTTOM} x2={W - PAD_X} y2={H - PAD_BOTTOM} stroke="#334155" strokeWidth="1" />
        <line x1={PAD_X} y1={PAD_TOP} x2={PAD_X} y2={H - PAD_BOTTOM} stroke="#334155" strokeWidth="1" />
        
        {xTicks.map(tick => (
          <g key={`x-tick-${tick}`}>
            <line x1={xScale(tick)} y1={H - PAD_BOTTOM} x2={xScale(tick)} y2={H - PAD_BOTTOM + 5} stroke="#334155" strokeWidth="1" />
            <text x={xScale(tick)} y={H - PAD_BOTTOM + 16} textAnchor="middle" fontSize="10" fill="#475569" fontFamily="monospace">
              {useTimeScale && timeLabels.length > tick ? timeLabels[tick] : tick}
            </text>
          </g>
        ))}

        <text x={W / 2} y={H - 15} textAnchor="middle" fontSize="11" fill="#475569" fontFamily="serif">
          {useTimeScale && timeLabels.length > 0 ? `Temps (${timeGranularity}) (n=${values.length})` : `Index Temporel (n=${values.length})`}
        </text>
      </svg>
    );
  };

  const renderTransducerGraph = () => {
    const transducer = transducers[selectedPattern];
    if(!transducer) return null;
    const statePositions = {
      d: { x: 100, y: 150 }, r: { x: 300, y: 150 }, t: { x: 500, y: 150 },
      u: { x: 300, y: 100 }, down: { x: 300, y: 200 }, p: { x: 400, y: 150 },
      f: { x: 550, y: 150 }, inc: { x: 300, y: 100 }, dec: { x: 300, y: 200 }
    };

    return (
      <svg width="650" height="350" className="mx-auto bg-white border border-slate-200">
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="#334155" />
          </marker>
        </defs>

        <line x1="40" y1="150" x2="65" y2="150" stroke="#334155" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
        <text x="15" y="153" fill="#334155" fontSize="11" fontFamily="serif">init</text>

        {transducer.transitions.map((t, idx) => {
          const fromPos = statePositions[t.from];
          const toPos = statePositions[t.to];
          if (!fromPos || !toPos) return null;

          if (t.from === t.to) {
            const cx = fromPos.x;
            const cy = fromPos.y - 40;
            return (
              <g key={idx}>
                <path d={`M ${cx} ${fromPos.y - 20} Q ${cx-20} ${cy-10} ${cx} ${cy} Q ${cx+20} ${cy-10} ${cx+5} ${fromPos.y - 22}`}
                  fill="none" stroke="#475569" strokeWidth="1" markerEnd="url(#arrowhead)" />
                <text x={cx} y={cy - 5} fontSize="10" fill="#0f172a" textAnchor="middle" fontFamily="monospace">
                  {t.label}
                </text>
              </g>
            );
          } else {
            const mx = (fromPos.x + toPos.x) / 2;
            const my = (fromPos.y + toPos.y) / 2 - 20;
            const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
            const offsetX = Math.cos(angle) * 22;
            const offsetY = Math.sin(angle) * 22;

            return (
              <g key={idx}>
                <path d={`M ${fromPos.x + offsetX} ${fromPos.y + offsetY} Q ${mx} ${my} ${toPos.x - offsetX - 5} ${toPos.y - offsetY - (angle===0?0:5)}`}
                  fill="none" stroke="#475569" strokeWidth="1" markerEnd="url(#arrowhead)" />
                <text x={mx} y={my - 5} fontSize="10" fill="#0f172a" textAnchor="middle" fontFamily="monospace">
                  {t.label}
                </text>
              </g>
            );
          }
        })}

        {transducer.states.map((state, idx) => {
          const pos = statePositions[state.name];
          if (!pos) return null;
          return (
            <g key={idx}>
              <circle cx={pos.x} cy={pos.y} r="20" fill="#f8fafc" stroke="#334155" strokeWidth={state.initial ? "2" : "1"} />
              {state.initial && <circle cx={pos.x} cy={pos.y} r="16" fill="none" stroke="#334155" strokeWidth="0.5" />}
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="12" fill="#0f172a" fontFamily="serif">{state.name}</text>
              <text x={pos.x} y={pos.y + 35} textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="serif">{state.label}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-slate-800 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white border border-slate-300 shadow-sm p-8 rounded-sm border-t-4 border-t-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-serif text-slate-900 mb-2 font-bold tracking-tight">
                Méta-Générateur de Transducteurs pour Séries Temporelles
              </h1>
              <p className="text-md text-slate-600 font-serif mb-4">
                Synthèse automatique de code d'évaluation de contraintes à partir d'automates finis
              </p>
              <div className="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-3 py-1 border border-slate-200">
                Référence : Beldiceanu et al. (2015) — Projet FIT A3 IMT Atlantique
              </div>
            </div>
            <Database className="text-slate-400" size={40} strokeWidth={1} />
          </div>
        </div>

        {/* 1. PANNEAU DE DONNÉES D'ENTRÉE (Indépendant) */}
        <div className="bg-white border border-slate-300 shadow-sm p-6 rounded-sm">
          <h2 className="text-xl font-serif font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200 pb-2">
            <LineChart size={20} className="text-slate-600" />
            Vecteur d'Entrée (Série Temporelle)
          </h2>

          <div className="mb-4">
            <div className="flex justify-between items-end mb-2">
              <label className="text-sm font-serif font-semibold text-slate-700">Données (séparées par des virgules)</label>
              <label className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 rounded cursor-pointer transition-colors border border-slate-300 font-bold">
                Importer Fichier CSV
                <input type="file" accept=".csv,.txt" onChange={handleCsvUpload} className="hidden" />
              </label>
            </div>
            <input
              type="text"
              value={testSeries.length > 150 ? testSeries.substring(0, 150) + '...' : testSeries}
              onChange={(e) => { setTestSeries(e.target.value); setTimeLabels([]); resetOutput(); }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50 font-mono"
              placeholder="e.g. 4,1,3,1,4,6,1,5,5..."
            />
            
            {csvFileName && csvColumns.length > 0 && (
              <div className="mt-3 bg-slate-50 p-3 border border-slate-200 rounded">
                <div className="flex flex-wrap gap-4 text-xs items-center mb-2">
                  <span className="font-semibold">{csvFileName}</span>
                  <div className="flex gap-2 items-center">
                    <span>Série :</span>
                    <select
                      value={selectedCsvColumn}
                      onChange={(e) => handleColumnChange(e.target.value)}
                      className="px-2 py-1 border border-slate-300 bg-white rounded font-mono"
                    >
                      {csvColumns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                    </select>
                  </div>
                  {csvCountries.length > 0 && (
                    <div className="flex gap-2 items-center">
                      <span>Filtre :</span>
                      <select
                        value={selectedCountry}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="px-2 py-1 border border-slate-300 bg-white rounded font-mono"
                      >
                        {csvCountries.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {csvDateColumns.length > 0 && (
                  <div className="flex flex-wrap gap-4 items-center bg-slate-100 p-2 border border-slate-200 text-xs mt-2">
                    <label className="flex items-center gap-1 font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useTimeScale}
                        onChange={(e) => handleUseTimeChange(e.target.checked)}
                        className="cursor-pointer"
                      />
                      Activer l'Axe Temporel
                    </label>
                    
                    {useTimeScale && (
                      <>
                        <div className="flex gap-2 items-center">
                          <span>Colonne de temps :</span>
                          <select
                            value={selectedDateColumn}
                            onChange={(e) => handleDateColChange(e.target.value)}
                            className="px-2 py-1 border border-slate-300 bg-white rounded font-mono"
                          >
                            {csvDateColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2 items-center">
                          <span>Échelle :</span>
                          <select
                            value={timeGranularity}
                            onChange={(e) => handleGranularityChange(e.target.value)}
                            className="px-2 py-1 border border-slate-300 bg-white rounded font-mono"
                          >
                            <option value="hour">Heure</option>
                            <option value="day">Jour</option>
                            <option value="month">Mois</option>
                            <option value="year">Année</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* APERÇU IMMÉDIAT DU GRAPHIQUE */}
          {renderPreviewChart()}
        </div>

        {/* 2. PARAMÈTRES DU MODÈLE FORMEL */}
        <div className="bg-white border border-slate-300 shadow-sm p-6 rounded-sm">
          <h2 className="text-xl font-serif font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200 pb-2">
            <GitBranch size={20} className="text-slate-600" />
            Paramètres du Modèle Formel
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="md:col-span-1">
              <label className="block text-sm font-serif font-semibold text-slate-700 mb-2">
                Motif Structurel (Transducteur)
              </label>
              <select
                value={selectedPattern}
                onChange={(e) => { setSelectedPattern(e.target.value); resetOutput(); }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50 font-mono"
              >
                <option value="" disabled>-- Sélectionner --</option>
                <option value="peak">Peak</option>
                <option value="valley">Valley</option>
                <option value="zigzag">Zigzag</option>
                <option value="plateau">Plateau</option>
                <option value="proper_plateau">Proper Plateau</option>
                <option value="inflexion">Inflexion</option>
                <option value="increasing">Increasing</option>
                <option value="decreasing">Decreasing</option>
                <option value="steady">Steady</option>
                <option value="increasing_sequence">Increasing Sequence</option>
                <option value="decreasing_sequence">Decreasing Sequence</option>
                <option value="summit">Summit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-serif font-semibold text-slate-700 mb-2">
                Caractéristique (Feature)
              </label>
              <select
                value={selectedFeature}
                onChange={(e) => { setSelectedFeature(e.target.value); resetOutput(); }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50 font-mono"
              >
                <option value="" disabled>-- Sélectionner --</option>
                <option value="width">Width (Largeur)</option>
                <option value="height">Height (Hauteur)</option>
                <option value="surface">Surface</option>
                <option value="min">Minimum</option>
                <option value="max">Maximum</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-serif font-semibold text-slate-700 mb-2">
                Opérateur d'Agrégation
              </label>
              <select
                value={selectedAggregator}
                onChange={(e) => { setSelectedAggregator(e.target.value); resetOutput(); }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50 font-mono"
              >
                <option value="" disabled>-- Sélectionner --</option>
                <option value="min">min(R, C)</option>
                <option value="max">max(R, C)</option>
                <option value="sum">sum(R, C)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-serif font-semibold text-slate-700 mb-2">
                Langage Cible
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => { setTargetLanguage(e.target.value); resetOutput(); }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50 font-mono"
              >
                <option value="" disabled>-- Sélectionner --</option>
                <option value="python">Python 3</option>
                <option value="java">Java (Stub)</option>
                <option value="c">C (Stub)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleGenerate}
              className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <FileCode size={16} />
              Générer Code
            </button>
            <button
              onClick={executeInBrowser}
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-5 py-2 rounded text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <Play size={16} />
              Évaluer la Contrainte
            </button>
          </div>
        </div>

        {/* 3. VISUALISATION DE L'AUTOMATE */}
        {showTransducer && selectedPattern && (
          <div className="bg-white border border-slate-300 shadow-sm p-6 rounded-sm">
            <h2 className="text-lg font-serif font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">
              Structure de l'Automate : {selectedPattern}
            </h2>
            <div className="flex justify-center mb-6">
              {renderTransducerGraph()}
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm font-mono text-slate-700">
              <div className="border border-slate-200 p-3 bg-slate-50">
                <span className="font-bold text-slate-900 block mb-1">États (Q)</span>
                |Q| = {transducers[selectedPattern].states.length}
              </div>
              <div className="border border-slate-200 p-3 bg-slate-50">
                <span className="font-bold text-slate-900 block mb-1">Signature (Σ)</span>
                RegEx: {transducers[selectedPattern].regex}
              </div>
              <div className="border border-slate-200 p-3 bg-slate-50">
                <span className="font-bold text-slate-900 block mb-1">Propriétés</span>
                b={transducers[selectedPattern].attributes.before}, a={transducers[selectedPattern].attributes.after}
              </div>
            </div>
          </div>
        )}

        {/* 4. RÉSULTATS D'EXÉCUTION */}
        {runResult && (
          <div className="bg-white border border-slate-300 shadow-sm p-6 rounded-sm border-l-4 border-l-blue-600">
            <h2 className="text-lg font-serif font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity size={18} className="text-blue-600" />
              Résultats de l'Évaluation : {runResult.constraint}
            </h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 p-3 border border-slate-200 text-center rounded">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Agrégation</p>
                <p className="text-xl font-mono font-bold text-slate-800">{runResult.aggregatedValue}</p>
              </div>
              <div className="bg-slate-50 p-3 border border-slate-200 text-center rounded">
                <p className="text-xs text-slate-500 uppercase tracking-wide">|Occurrences|</p>
                <p className="text-xl font-mono font-bold text-slate-800">{runResult.occurrences.length}</p>
              </div>
              <div className="bg-slate-50 p-3 border border-slate-200 text-center rounded">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Dimension (n)</p>
                <p className="text-xl font-mono font-bold text-slate-800">{runResult.totalPoints}</p>
              </div>
            </div>

            {runResult.occurrences.length > 0 && (
              <div className="mb-6">
                <table className="w-full text-xs text-left border-collapse border border-slate-200">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="p-2 border-r border-slate-200">Idx</th>
                      <th className="p-2 border-r border-slate-200">Plage Temporelle</th>
                      <th className="p-2 border-r border-slate-200">Largeur</th>
                      <th className="p-2 border-r border-slate-200">Hauteur</th>
                      <th className="p-2 border-r border-slate-200">Surface</th>
                      <th className="p-2 border-r border-slate-200">Max</th>
                      <th className="p-2">Min</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runResult.occurrences.map((occ, idx) => {
                      const isExtreme = occ[selectedFeature] === (selectedAggregator==='min'?Math.min(...runResult.occurrences.map(o=>o[selectedFeature])):Math.max(...runResult.occurrences.map(o=>o[selectedFeature])));
                      
                      const startLabel = useTimeScale && timeLabels.length > 0 ? timeLabels[occ.indices[0]] : occ.indices[0];
                      const endLabel = useTimeScale && timeLabels.length > 0 ? timeLabels[occ.indices[occ.indices.length-1]] : occ.indices[occ.indices.length-1];

                      return (
                        <tr key={idx} className={`border-b border-slate-200 font-mono ${isExtreme ? 'bg-blue-50 font-bold' : ''}`}>
                          <td className="p-2 border-r border-slate-200">{idx + 1}</td>
                          <td className="p-2 border-r border-slate-200">[{startLabel} .. {endLabel}]</td>
                          <td className="p-2 border-r border-slate-200">{occ.width}</td>
                          <td className="p-2 border-r border-slate-200">{occ.height}</td>
                          <td className="p-2 border-r border-slate-200">{occ.surface}</td>
                          <td className="p-2 border-r border-slate-200">{occ.max}</td>
                          <td className="p-2">{occ.min}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="border border-slate-200 p-4 bg-slate-50">
              {renderChart()}
            </div>
          </div>
        )}

        {/* 5. CODE GÉNÉRÉ */}
        {generatedCode && (
          <div className="bg-[#1e1e1e] border border-slate-700 shadow-sm rounded-sm">
            <div className="flex justify-between items-center p-3 border-b border-slate-700 bg-[#2d2d2d]">
              <h2 className="text-sm font-mono text-slate-300 flex items-center gap-2">
                <FileText size={16} />
                synthese_{selectedAggregator}_{selectedFeature}_{selectedPattern}.{targetLanguage === 'python' ? 'py' : targetLanguage === 'java' ? 'java' : 'c'}
              </h2>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedCode).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className="text-xs text-slate-300 hover:text-white border border-slate-600 px-2 py-1 rounded bg-[#3c3c3c] transition-colors"
              >
                {copied ? 'Copié' : 'Copier'}
              </button>
            </div>
            <div className="p-4 overflow-x-auto">
              <pre className="text-xs text-slate-300 font-mono leading-relaxed">
                <code>{generatedCode}</code>
              </pre>
            </div>
          </div>
        )}

        {/* 6. DÉTECTEUR D'ANOMALIES */}
        <div className="bg-white border border-slate-300 shadow-sm p-6 rounded-sm border-l-4 border-l-red-800">
          <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
            <h2 className="text-lg font-serif font-bold text-slate-800">
              Identification d'Anomalies Multi-Critères
            </h2>
            <button
              onClick={() => setAnomalyMode(!anomalyMode)}
              className="text-sm text-slate-600 hover:text-slate-900 border border-slate-300 px-3 py-1 bg-slate-50 rounded"
            >
              {anomalyMode ? 'Masquer' : 'Configurer'}
            </button>
          </div>

          {anomalyMode && (
            <div>
              <p className="text-sm text-slate-600 mb-4 font-serif italic">
                Définition : Une anomalie correspond à l'intersection d'occurrences maximisant ou minimisant conjointement plusieurs métriques structurelles.
              </p>

              <div className="space-y-2 mb-4">
                {anomalyCriteria.map((criterion, index) => (
                  <div key={index} className="flex items-center gap-3 bg-slate-50 p-2 border border-slate-200 text-sm font-mono">
                    <span className="font-bold text-slate-500 w-6">C{index + 1}</span>
                    <select
                      value={criterion.pattern}
                      onChange={(e) => updateCriterion(index, 'pattern', e.target.value)}
                      className="border border-slate-300 px-2 py-1 bg-white"
                    >
                      {Object.keys(transducers).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select
                      value={criterion.feature}
                      onChange={(e) => updateCriterion(index, 'feature', e.target.value)}
                      className="border border-slate-300 px-2 py-1 bg-white"
                    >
                      {Object.keys(featureFunctions).map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select
                      value={criterion.aggregator}
                      onChange={(e) => updateCriterion(index, 'aggregator', e.target.value)}
                      className="border border-slate-300 px-2 py-1 bg-white w-20"
                    >
                      <option value="min">min</option>
                      <option value="max">max</option>
                    </select>
                    {anomalyCriteria.length > 1 && (
                      <button onClick={() => removeCriterion(index)} className="text-red-700 font-bold ml-auto px-2">×</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mb-6">
                <button onClick={addCriterion} className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1 rounded text-slate-700 border border-slate-300">
                  + Ajouter Condition
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={executeAnomalyInBrowser} className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded text-sm font-semibold transition-colors">
                  Exécuter Détection
                </button>
                <button onClick={handleGenerateAnomaly} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors">
                  Générer Script Python
                </button>
              </div>
              
              {anomalyCode && (
                <div className="mt-4 bg-[#1e1e1e] border border-slate-700 rounded-sm">
                  <div className="p-3 border-b border-slate-700 bg-[#2d2d2d]">
                     <h2 className="text-sm font-mono text-slate-300 flex items-center gap-2">
                        <FileText size={16} /> anomaly_detector.py
                     </h2>
                  </div>
                  <pre className="p-4 text-xs text-slate-300 font-mono overflow-x-auto">
                    {anomalyCode}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {anomalyResult && (
          <div className="bg-white border border-slate-300 shadow-sm p-6 rounded-sm">
            <h3 className="font-serif font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Rapport d'Anomalie</h3>
            <div className="border border-slate-200 p-4 bg-slate-50 mb-4">
              {renderAnomalyChart()}
            </div>
            
            {anomalyResult.strictAnomalies.length > 0 ? (
              <div className="mb-4">
                <h4 className="text-sm font-bold text-red-800 mb-2">Anomalies Strictes Détectées</h4>
                {anomalyResult.strictAnomalies.map((a, i) => {
                  const startLabel = useTimeScale && timeLabels.length > 0 ? timeLabels[a.occurrence.indices[0]] : a.occurrence.indices[0];
                  const endLabel = useTimeScale && timeLabels.length > 0 ? timeLabels[a.occurrence.indices[a.occurrence.indices.length-1]] : a.occurrence.indices[a.occurrence.indices.length-1];

                  return (
                    <div key={i} className="text-xs font-mono bg-red-50 p-2 border border-red-200 mb-1 text-red-900">
                      [T:{a.pattern}] Intervalle: {startLabel}..{endLabel} | W:{a.occurrence.width} H:{a.occurrence.height}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-600 italic">Aucune anomalie stricte identifiée (intersection vide).</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransducerCodeGenerator;