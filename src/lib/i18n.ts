import type { TableColumn } from '../types'

export type Sprache = 'de' | 'en'

/**
 * Übersetzungen Deutsch → Englisch.
 * Schlüssel ist der deutsche Originaltext; fehlt ein Eintrag, bleibt der deutsche Text stehen.
 */
export const EN: Record<string, string> = {
  // --- Allgemein ---
  Speichern: 'Save',
  speichern: 'save',
  Laden: 'Load',
  laden: 'load',
  'Speichert…': 'Saving…',
  'Lädt…': 'Loading…',
  löschen: 'delete',
  Kopieren: 'Copy',
  Einfügen: 'Paste',
  einfügen: 'paste',
  Info: 'Info',
  Bearbeiten: 'Edit',
  Fertig: 'Done',
  Schließen: 'Close',
  Anzeigen: 'Show',
  Name: 'Name',
  Wert: 'Value',
  Typ: 'Type',
  Felder: 'Fields',
  optional: 'optional',
  übersprungen: 'skipped',
  'extern bearbeitet': 'processed externally',
  'Keine Schritte': 'No steps',
  'Keine Abteilungen vorhanden.': 'No departments available.',
  'Keine Nebentabellen': 'No support processes',
  'Noch keine': 'None yet',
  von: 'of',
  oder: 'or',
  und: 'and',
  Anzahl: 'Count',
  Ziel: 'Target',
  Bedingung: 'Condition',
  Schleife: 'Loop',
  Wiederholung: 'Repetition',
  Wiederholungen: 'Repetitions',
  Durchlauf: 'Run',
  Durchläufe: 'Runs',
  Werte: 'Values',
  'Werte des Auftrags': 'Values of the order',
  Arbeitsplatz: 'Workplace',
  Arbeitsplätze: 'Workplaces',
  Abteilung: 'Department',
  Abteilungen: 'Departments',
  Schritt: 'Step',
  Schritte: 'Steps',
  Kette: 'Chain',
  Ketten: 'Chains',
  Maschine: 'Machine',
  Maschinen: 'Machines',
  Tabelle: 'Table',
  Tabellen: 'Tables',
  Zeile: 'Row',
  Spalte: 'Column',
  Spalten: 'Columns',
  Feld: 'Field',
  Feldname: 'Field name',
  Dokument: 'Document',
  Datum: 'Date',
  Uhrzeit: 'Time',
  FN: 'FN',
  Produktion: 'Production',
  Fertigungsauftrag: 'Production Order',
  Materialnummer: 'Material No.',
  'Unterstützungsprozess': 'Support Process',
  'Unterstützungsprozesse': 'Support Processes',
  'Variabler Block': 'Variable Block',
  'Variable Blöcke': 'Variable Blocks',
  'Zusammengefasst': 'Summary',
  'Tabellenbezogen': 'Table based',
  'Produkt hinzufügen': 'Add product',
  'Produktinfo': 'Product info',
  'Produkt manuell hinzufügen': 'Add product manually',
  'Maschinendaten importieren': 'Import machine data',

  // --- Dashboard ---
  Dashboard: 'Dashboard',
  'Fertigungsauftrag als Leitende Nummer – Trace oder Verteilung je Maschine.':
    'Production order as the leading number – trace or distribution per machine.',
  'Cloud wird geprüft…': 'Checking cloud…',
  'Cloud ist leer': 'Cloud is empty',
  'Cloud verbunden': 'Cloud connected',
  'Fehler: {text}': 'Error: {text}',
  'Gespeichert {zeit}': 'Saved {zeit}',
  'Neue Prozesskette': 'New process chain',
  'Aktuelle Prozesskette löschen (mit Sicherheitsabfrage)': 'Delete current process chain (with confirmation)',
  'Prozesskette wechseln': 'Switch process chain',
  'Lokale Daten in die Cloud hochladen': 'Upload local data to the cloud',
  'Stand aus der Cloud laden (ersetzt lokale Daten)': 'Load from the cloud (replaces local data)',
  'Neue Abteilung anlegen': 'Create new department',
  'Kopierte Abteilung in die aktive Kette einfügen': 'Paste copied department into the active chain',
  'Prozesskette „{name}" wirklich löschen?\n\nDabei werden {anzahl} Abteilung(en) mit allen Schritten, Arbeitsplätzen und Einträgen sowohl hier als auch in der Cloud entfernt. Das kann nicht rückgängig gemacht werden.':
    'Really delete process chain "{name}"?\n\nThis removes {anzahl} department(s) with all steps, workplaces and entries both here and in the cloud. This cannot be undone.',
  'Prozesskette „{name}" gelöscht.': 'Process chain "{name}" deleted.',
  'Die Cloud ist leer – diese Daten liegen nur in diesem Browser. Lade sie hoch, damit sie auf allen PCs sichtbar sind.':
    'The cloud is empty – this data exists only in this browser. Upload it so it is visible on all PCs.',
  'Jetzt hochladen': 'Upload now',
  '+ Kette': '+ Chain',
  '+ Abteilung': '+ Department',
  'Kette löschen': 'Delete chain',
  'In Cloud speichern': 'Save to cloud',
  'Aus Cloud laden': 'Load from cloud',

  // --- Feste Spalten/Spaltentypen ---
  Text: 'Text',
  Zahl: 'Number',
  fix: 'fixed',
  fest: 'fixed',

  // --- Tabellen ---
  'Tabelle kopieren (Spalten + Zeilen)': 'Copy table (columns + rows)',
  'Tabelle löschen': 'Delete table',
  '+ Zeile': '+ Row',
  '+ Spalte': '+ Column',
  '+ Feld': '+ Field',
  'Zeile löschen': 'Delete row',
  'Spalte löschen': 'Delete column',
  'Feld löschen': 'Delete field',
  'Noch keine Durchläufe': 'No runs yet',
  'Spaltentyp': 'Column type',
  'Kopierte Maschinentabelle hier einfügen': 'Paste copied machine table here',
  'Kopierte Nebentabelle hier einfügen': 'Paste copied support process here',
  'Kopierte Abteilung hier einfügen': 'Paste copied department here',
  'Tabelle eingefügt': 'Table pasted',
  'Tabelle eingefügt – Arbeitsplatz war belegt, bitte neu zuweisen':
    'Table pasted – workplace number was taken, please assign a new one',
  'Zwischenablage leer oder unbekanntes Format': 'Clipboard empty or unknown format',
  'Zwischenablage enthält keine Maschinentabelle': 'Clipboard does not contain a machine table',
  'Zwischenablage enthält keine Nebentabelle': 'Clipboard does not contain a support process',
  'Zwischenablage enthält keine kopierte Abteilung': 'Clipboard does not contain a copied department',
  '{name} kopiert': '"{name}" copied',
  '{name} kopiert (App-Ablage)': '"{name}" copied (app storage)',
  'Abteilung „{name}" eingefügt': 'Department "{name}" pasted',
  'Abteilung „{name}" eingefügt – Arbeitsplatznummern waren belegt, bitte neu zuweisen':
    'Department "{name}" pasted – workplace numbers were taken, please assign new ones',
  'Abteilung „{name}" kopiert': 'Department "{name}" copied',
  'Abteilung „{name}" kopiert (App-Ablage)': 'Department "{name}" copied (app storage)',

  // --- Arbeitsplatz / Nummern ---
  'Arbeitsplatz-Nummer (gilt für alle Einträge)': 'Workplace number (applies to all entries)',
  'Arbeitsplatz-Nummer fehlt': 'Workplace number missing',
  'Arbeitsplatz-Nummer der Maschine': 'Workplace number of the machine',
  'Nr.': 'No.',
  'Nr. zuweisen': 'Assign no.',
  'Arbeitsplatz „{wert}" ist bereits bei „{belegt}" vergeben.': 'Workplace "{wert}" is already used by "{belegt}".',
  'Immer enthalten': 'Always included',
  'Pflicht: Uhrzeit des Ablaufs an dieser Maschine': 'Required: time of the run at this machine',
  'Pflicht: Uhrzeit des Ablaufs an dieser Maschine (für die Reihenfolge)':
    'Required: time of the run at this machine (for the order)',
  'Wie viele Wiederholungen der Schleife werden angelegt?': 'How many repetitions of the loop are created?',
  'Wie oft die Maschine je Wiederholung genutzt wird': 'How often the machine is used per repetition',
  'Anzahl der Durchläufe (Arbeitswiederholungen) an dieser Maschine':
    'Number of runs (machine repetitions) at this machine',
  'Welche Wiederholung der Schleife ist dieser Eintrag?': 'Which repetition of the loop is this entry?',
  'Uhrzeit fehlt – jede angesetzte Maschine braucht eine Uhrzeit':
    'Time missing – every scheduled machine needs a time',
  'Für diesen Auftrag existiert bei dieser Maschine schon ein Eintrag':
    'An entry already exists for this order at this machine',
  'Arbeitswiederholung': 'Machine repetition',
  'Werte eines anderen Durchlaufs anzeigen': 'Show values of another run',
  'Wiederholung der Schleife wählen': 'Select repetition of the loop',

  // --- Schleifen / Verbindungen ---
  '⟲ Schleife': '⟲ Loop',
  'Schritt liegt in einer Schleife': 'Step is part of a loop',
  'Ziel für Rücksprung: Schritt oder variabler Block': 'Loop-back target: step or variable block',
  'Schleife entfernen': 'Remove loop',
  'Schritt in einen anderen Block oder als festen Schritt verschieben':
    'Move step to another block or make it a fixed step',
  'Variabler Block – Container mit Schritten in variabler Reihenfolge':
    'Variable block – container with steps in variable order',

  // --- Info-Fenster ---
  'Info anzeigen': 'Show info',
  'Abteilung kopieren (in eine andere Kette einfügbar)': 'Copy department (can be pasted into another chain)',
  '3D-Modell (CAD)': '3D model (CAD)',
  'Kein Modell hinterlegt': 'No model stored',
  'Datei: {name}': 'File: {name}',
  'Modell entfernen': 'Remove model',
  'Modell lädt…': 'Loading model…',
  'ziehen = drehen · Rad = zoomen · rechts ziehen = verschieben':
    'drag = rotate · wheel = zoom · right drag = pan',
  'Diese Infos hat jeder Fertigungsauftrag in der Abteilung. Werte werden später je Auftrag erfasst.':
    'Every production order has these infos in the department. Values will be captured per order later.',
  'Noch keine eigenen Felder – mit „+ Feld" ergänzen (z. B. Gewicht, Anzahl Trauben).':
    'No custom fields yet – add with "+ Field" (e.g. weight, number of clusters).',
  'Nur die drei festen Felder – über „Bearbeiten" ergänzen.':
    'Only the three fixed fields – add more via "Edit".',
  'Allgemeine Infos zum Produkt dieser Kette. Änderungen werden automatisch gespeichert.':
    'General infos about the product of this chain. Changes are saved automatically.',
  'Produktinfo – {name}': 'Product info – {name}',
  'Info – {name}': 'Info – {name}',

  // --- Passwort ---
  Passwort: 'Password',
  Öffnen: 'Open',
  'Falsches Passwort.': 'Wrong password.',
  'Digitale Produktakte': 'Digital product record',
  'Produktions-Dashboard': 'Production dashboard',
  'Strg + Z: letzte Änderung rückgängig': 'Ctrl + Z: undo last change',

  // --- Filterleiste ---
  'Fertigungsauftrag (Leitende Nummer)': 'Production order (leading number)',
  'Datum (ein Tag)': 'Date (one day)',
  Zurücksetzen: 'Reset',
  'Trace: Weg des Auftrags': 'Trace: path of the order',
  'Verteilung je Maschine': 'Distribution per machine',

  // --- Schritte / Abteilungen ---
  'fester Schritt': 'fixed step',
  'Schritt löschen': 'Delete step',
  'Schritt nach oben': 'Move step up',
  'Schritt nach unten': 'Move step down',
  'Zugehörigkeit: fester Schritt oder Variabler Block': 'Assignment: fixed step or variable block',
  'Block nach oben': 'Move block up',
  'Block nach unten': 'Move block down',
  'Block löschen': 'Delete block',
  'Abteilung löschen': 'Delete department',
  '+ Schritt': '+ Step',
  '+ Variabler Block': '+ Variable block',
  'Ersten Produktionsschritt hinzufügen': 'Add first production step',
  '+ Schritt über den Button oben hinzufügen': '+ Add a step via the button above',
  'optional (überspringbar, wenn kein Eintrag)': 'optional (skipped if no entry)',
  'Schritt {n}': 'Step {n}',
  'Neue Maschine': 'New machine',
  'Neue Nebentabelle': 'New support process',
  'Neues Feld': 'New field',
  'Zeitbezogene Daten der Abteilung (z. B. Wachsqualität).':
    'Time-related data of the department (e.g. wax quality).',

  // --- Trace ---
  'Auftrag {name}': 'Order {name}',
  'Nebentabellen zum Zeitpunkt {datum}': 'Support processes at {datum}',
  'Auftrag „{name}" wurde in keiner Maschine gefunden.':
    'Order "{name}" was not found in any machine.',
}

/** Feste (systemseitige) Spaltennamen je Sprache. */
export const FESTE_SPALTEN: Record<string, { de: string; en: string }> = {
  auftragsnummer: { de: 'Fertigungsauftrag', en: 'Production Order' },
  fn: { de: 'FN', en: 'FN' },
  datum: { de: 'Datum', en: 'Date' },
  zeit: { de: 'Uhrzeit', en: 'Time' },
  produktion: { de: 'Produktion', en: 'Production' },
  wdh: { de: 'Wdh', en: 'Rep.' },
}

/** Anzeigename einer Spalte – feste Systemspalten werden übersetzt, eigene bleiben unverändert. */
export function spaltenName(col: TableColumn, sprache: Sprache): string {
  const fest = FESTE_SPALTEN[col.id]
  if (fest && (col.fixed || col.id === 'wdh')) return sprache === 'en' ? fest.en : fest.de
  return col.name
}

export function uebersetze(
  text: string,
  sprache: Sprache,
  werte?: Record<string, string | number>,
): string {
  let ergebnis = sprache === 'en' ? (EN[text] ?? text) : text
  if (werte) {
    for (const [k, v] of Object.entries(werte)) {
      ergebnis = ergebnis.split(`{${k}}`).join(String(v))
    }
  }
  return ergebnis
}
