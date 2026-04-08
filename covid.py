"""
Détecteur d'Anomalies COVID-19 — DONNÉES RÉELLES
==================================================
Télécharge les vraies données depuis Our World in Data,
puis applique le détecteur d'anomalies multi-critères
généré par le méta-générateur (transducteurs finis).

Usage :
  1. pip install requests    (si pas déjà installé)
  2. python covid_real_data.py

Projet FIT A3 2025-2026 — IMT Atlantique
Superviseur : Nicolas Beldiceanu
"""

import csv
import io
import os
import sys
from datetime import datetime

# =============================================================================
# Téléchargement des données réelles
# =============================================================================

def download_owid_data(country='France'):
    """
    Télécharge les données COVID-19 depuis Our World in Data.
    Utilise le CSV complet du catalogue OWID.
    """
    url = "https://catalog.ourworldindata.org/garden/covid/latest/compact/compact.csv"

    # Essayer avec requests
    try:
        import requests
        print(f"   Téléchargement depuis Our World in Data...")
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        raw = resp.text
    except ImportError:
        # Fallback : urllib
        import urllib.request
        print(f"   Téléchargement via urllib...")
        with urllib.request.urlopen(url, timeout=60) as response:
            raw = response.read().decode('utf-8')

    # Parser le CSV et filtrer par pays
    reader = csv.DictReader(io.StringIO(raw))
    dates = []
    values = []

    for row in reader:
        if row.get('country', '') != country:
            continue
        date_str = row.get('date', '')
        new_cases = row.get('new_cases_smoothed', '') or row.get('new_cases', '')
        if not date_str or not new_cases:
            continue
        try:
            val = int(float(new_cases))
            if val < 0:
                val = 0
            dates.append(datetime.strptime(date_str, '%Y-%m-%d'))
            values.append(val)
        except (ValueError, TypeError):
            continue

    return dates, values


def load_from_local_csv(filepath):
    """
    Charge les données depuis un fichier CSV local.
    Le CSV doit avoir les colonnes 'date' et 'new_cases' (ou 'new_cases_smoothed').
    
    Utile si tu as déjà téléchargé le fichier owid-covid-data.csv.
    """
    dates = []
    values = []
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Filtrer par France si le CSV est global
            if 'location' in row and row['location'] != 'France':
                continue
            if 'country' in row and row['country'] != 'France':
                continue
            date_str = row.get('date', '')
            new_cases = row.get('new_cases_smoothed', '') or row.get('new_cases', '')
            if not date_str or not new_cases:
                continue
            try:
                val = int(float(new_cases))
                if val < 0:
                    val = 0
                dates.append(datetime.strptime(date_str, '%Y-%m-%d'))
                values.append(val)
            except (ValueError, TypeError):
                continue
    return dates, values


# =============================================================================
# Code généré par le méta-générateur (transducteur peak)
# =============================================================================

def signature(values):
    sig = []
    for i in range(len(values) - 1):
        if values[i] < values[i + 1]:
            sig.append('<')
        elif values[i] == values[i + 1]:
            sig.append('=')
        else:
            sig.append('>')
    return sig


def detect_peak_occurrences(values):
    """Généré depuis le transducteur peak (3 états, 7 transitions)."""
    if len(values) < 2:
        return []
    sig = signature(values)
    state = 'd'
    occurrences = []
    current_occ = []
    pending_after = []
    C_width = 0; D_width = 0; has_current = False

    for i, s in enumerate(sig):
        sem = None
        if state == 'd' and s in ['>', '=']:
            sem = 'out'; state = 'd'
        elif state == 'd' and s == '<':
            sem = 'out'; state = 'r'
        elif state == 'r' and s in ['<', '=']:
            sem = 'maybeb'; state = 'r'
        elif state == 'r' and s == '>':
            sem = 'found'; state = 't'
        elif state == 't' and s == '>':
            sem = 'in'; state = 't'
        elif state == 't' and s == '=':
            sem = 'maybea'; state = 't'
        elif state == 't' and s == '<':
            sem = 'outa'; state = 'r'

        if sem == 'out': pass
        elif sem == 'outa':
            if has_current and current_occ:
                ov = [values[j] for j in current_occ]
                occurrences.append({
                    'indices': list(current_occ), 'values': ov,
                    'width': len(current_occ), 'height': max(ov) - min(ov),
                    'surface': sum(ov), 'max': max(ov), 'min': min(ov),
                })
            C_width = 0; D_width = 0; has_current = False
            current_occ = []; pending_after = []
        elif sem == 'maybeb':
            D_width += 1; current_occ.append(i)
        elif sem == 'maybea':
            D_width += 1; pending_after.append(i)
        elif sem == 'found':
            C_width = D_width + 1; D_width = 0; has_current = True
            current_occ.append(i); pending_after = []
        elif sem == 'founde':
            current_occ.append(i)
            if current_occ:
                ov = [values[j] for j in current_occ]
                occurrences.append({
                    'indices': list(current_occ), 'values': ov,
                    'width': len(current_occ), 'height': max(ov) - min(ov),
                    'surface': sum(ov), 'max': max(ov), 'min': min(ov),
                })
                current_occ = []
            pending_after = []; has_current = False
        elif sem == 'in':
            C_width = C_width + D_width + 1; D_width = 0
            current_occ.extend(pending_after); pending_after = []
            current_occ.append(i)

    if has_current and current_occ:
        ov = [values[j] for j in current_occ]
        occurrences.append({
            'indices': list(current_occ), 'values': ov,
            'width': len(current_occ), 'height': max(ov) - min(ov),
            'surface': sum(ov), 'max': max(ov), 'min': min(ov),
        })
    return occurrences


# =============================================================================
# Détecteur d'anomalies multi-critères
# =============================================================================

def detect_anomalies(occurrences, criteria):
    if len(occurrences) < 2:
        return [], []

    # Intersection stricte
    extreme_sets = []
    for feature, aggregator in criteria:
        vals = [occ[feature] for occ in occurrences]
        target = max(vals) if aggregator == 'max' else min(vals)
        extreme_sets.append({i for i, occ in enumerate(occurrences) if occ[feature] == target})

    common = extreme_sets[0]
    for s in extreme_sets[1:]:
        common &= s
    strict = [occurrences[i] for i in common]

    # Z-score
    scored = []
    for idx, occ in enumerate(occurrences):
        score = 0
        details = {}
        for feature, aggregator in criteria:
            vals = [o[feature] for o in occurrences]
            mean = sum(vals) / len(vals)
            std = (sum((v - mean) ** 2 for v in vals) / len(vals)) ** 0.5
            if std == 0: continue
            z = (occ[feature] - mean) / std
            score += z if aggregator == 'max' else -z
            details[f'z_{feature}'] = z
        scored.append({'index': idx, 'occurrence': occ, 'score': score, 'details': details})
    scored.sort(key=lambda x: x['score'], reverse=True)
    return strict, scored


# =============================================================================
# Exécution
# =============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("  DÉTECTEUR D'ANOMALIES COVID-19 — DONNÉES RÉELLES")
    print("  Généré par le Méta-Générateur — FIT A3 2025-2026")
    print("=" * 70)

    # --- Chargement des données ---
    dates, values = None, None

    # Option 1 : fichier local
    local_files = ['owid-covid-data.csv', 'compact.csv', 'covid_france.csv']
    for f in local_files:
        if os.path.exists(f):
            print(f"\n📂 Fichier local trouvé : {f}")
            dates, values = load_from_local_csv(f)
            break

    # Option 2 : téléchargement
    if dates is None:
        print("\n📊 Téléchargement des données réelles depuis Our World in Data...")
        try:
            dates, values = download_owid_data('France')
        except Exception as e:
            print(f"   ❌ Erreur de téléchargement : {e}")
            print(f"\n   Pour utiliser les données réelles :")
            print(f"   1. Télécharge le CSV depuis :")
            print(f"      https://catalog.ourworldindata.org/garden/covid/latest/compact/compact.csv")
            print(f"   2. Place le fichier dans le même dossier que ce script")
            print(f"   3. Relance : python {sys.argv[0]}")
            sys.exit(1)

    if not values or len(values) < 10:
        print("   ❌ Pas assez de données trouvées.")
        sys.exit(1)

    print(f"   ✅ {len(values)} jours de données chargés")
    print(f"   Période : {dates[0].strftime('%d/%m/%Y')} → {dates[-1].strftime('%d/%m/%Y')}")
    print(f"   Pic max dans les données : {max(values):,} cas/jour")

    # --- Détection des pics ---
    print(f"\n🔺 Détection des pics via le transducteur peak...")
    all_peaks = detect_peak_occurrences(values)
    print(f"   {len(all_peaks)} pics détectés au total")

    # Filtrage : garder les vagues significatives
    if max(values) > 100000:
        threshold = 10000
    elif max(values) > 10000:
        threshold = 1000
    else:
        threshold = 100

    significant = [o for o in all_peaks if o['height'] > threshold]
    print(f"   {len(significant)} pics significatifs (height > {threshold:,})")

    if len(significant) == 0:
        print("   ❌ Aucun pic significatif trouvé. Essayez un seuil plus bas.")
        sys.exit(1)

    # Afficher les vagues
    print(f"\n{'—' * 70}")
    for i, occ in enumerate(significant):
        start = dates[occ['indices'][0]].strftime('%d/%m/%Y')
        end = dates[occ['indices'][-1]].strftime('%d/%m/%Y')
        print(f"  Vague #{i+1:2d} | {start} → {end} | "
              f"pic={occ['max']:>10,} | width={occ['width']:3d}j | "
              f"height={occ['height']:>10,} | surface={occ['surface']:>12,}")

    # --- Contraintes ---
    print(f"\n{'=' * 70}")
    print("  CONTRAINTES APPLIQUÉES")
    print(f"{'=' * 70}")
    for feat, agg in [('height','max'),('height','min'),('width','min'),('width','max'),('surface','max')]:
        vals = [o[feat] for o in significant]
        result = max(vals) if agg == 'max' else min(vals)
        idx = next(i for i, o in enumerate(significant) if o[feat] == result)
        occ = significant[idx]
        start = dates[occ['indices'][0]].strftime('%d/%m/%Y')
        end = dates[occ['indices'][-1]].strftime('%d/%m/%Y')
        print(f"  📌 {agg}_{feat}_peak = {result:>12,}  →  {start} – {end}")

    # --- Anomalies ---
    print(f"\n{'=' * 70}")
    print("  DÉTECTION D'ANOMALIES (Étape 4 du sujet)")
    print(f"{'=' * 70}")

    tests = [
        ("max_height + min_width (pic haut ET court)", [('height','max'),('width','min')]),
        ("max_height + max_surface (pic haut ET beaucoup de cas)", [('height','max'),('surface','max')]),
        ("max_height + min_width + max_surface (triple critère)", [('height','max'),('width','min'),('surface','max')]),
    ]

    for label, criteria in tests:
        print(f"\n  🔍 {label}")
        strict, scored = detect_anomalies(significant, criteria)

        if strict:
            for a in strict:
                start = dates[a['indices'][0]].strftime('%d/%m/%Y')
                end = dates[a['indices'][-1]].strftime('%d/%m/%Y')
                print(f"     ⚠️  ANOMALIE STRICTE : {start} → {end}")
                print(f"         height={a['height']:,}, width={a['width']}, surface={a['surface']:,}, max={a['max']:,}")
        else:
            print(f"     Pas d'intersection stricte.")

        print(f"     Top 3 par z-score :")
        for rank, s in enumerate(scored[:3]):
            occ = s['occurrence']
            start = dates[occ['indices'][0]].strftime('%d/%m/%Y')
            end = dates[occ['indices'][-1]].strftime('%d/%m/%Y')
            marker = " ⚠️" if rank == 0 and s['score'] > 1.5 else ""
            print(f"       #{rank+1} score={s['score']:+6.2f} | {start}→{end} | "
                  f"h={occ['height']:>10,} w={occ['width']:3d} s={occ['surface']:>12,}{marker}")

    # --- Résumé ---
    print(f"\n{'=' * 70}")
    print("  RÉSUMÉ")
    print(f"{'=' * 70}")
    print(f"  Source              : Our World in Data (données réelles)")
    print(f"  Pays                : France")
    print(f"  Points              : {len(values)}")
    print(f"  Pics significatifs  : {len(significant)}")
    print(f"  Complexité          : O(n)")
    print()