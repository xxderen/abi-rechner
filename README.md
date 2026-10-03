# Abi-Rechner Hildegardis-Schule Hagen

Inoffizieller Rechner für die **Zulassung zum Abitur (Block I)**, die **Abiturprüfungen (Block II)** und die
**Abiturnote**. Er rechnet nach den Regeln der Präsentation der Hildegardis-Schule zur Abiturzulassung
(Abitur 2027, APO-GOSt NRW).

> **Inoffizieller Rechner – keine Gewähr. Maßgeblich ist die Berechnung der Schule.**

**Live:** https://xxderen.github.io/abi-rechner/

Die App ist für alle Schülerinnen und Schüler der Schule gedacht. Vorausgefüllt ist eine Beispiel-Belegung
(Mathematik-LK, Chemie-LK, Deutsch, Sozialwissenschaften …) ohne Noten. Fächer, Kursarten und Abiturfächer
kann jede und jeder selbst anpassen.

## Was die App kann

- **Kurse & Noten:** Punkte 0–15 pro Halbjahr (Q1.1–Q2.2), zu jeder Punktzahl die Note (15 = 1+ … 00 = 6).
  Halbjahre ohne Zeugnis gelten als Prognose und sind türkis gestrichelt markiert. Fächer lassen sich
  hinzufügen, entfernen und einstellen: Kursart, Abifach, belegte Halbjahre, neu einsetzende Fremdsprache,
  Projektkurs, Vertiefungskurs. Dazu kommen ein Schwerpunkt und Philosophie als Ersatzfach.
- **Zulassung (Block I):** alle Zulassungsvoraussetzungen mit ✔/✘ und ein **Best-Case-Optimierer**. Er probiert
  jede Pflicht-Variante und jede Anzahl von 35 bis 40 Kursen durch und wählt die Einbringung mit dem höchsten
  Block I. Die Kurse sind wie auf der Schulfolie markiert: Pflicht = gelb, zusätzlich = grün,
  nicht eingebracht = grau.
- **Abitur (Block II):** die vier Prüfungsfächer (× 5), die Bestehensregeln, die mündliche Nachprüfung
  (Pflicht oder freiwillig) und die Tabelle „Mündlich – Was bringt’s?“.
- **Ergebnis & Ziel:** Gesamtpunkte und Note nach der Tabelle der Schule, der Kasten „Änderung der
  Durchschnittsnote“, ein Zielnoten-Rechner und der nötige Schnitt in den restlichen Kursen.
- Alles wird bei jeder Eingabe live neu berechnet und funktioniert am Handy.

## Datenschutz

Deine Noten werden **nur in deinem Browser** gespeichert (`localStorage`). Es gibt keinen Server, keine
Anmeldung, keine Cookies und kein Tracking, und nichts wird übertragen. Mit **Export/Import (JSON)** nimmst du
deine Daten auf ein anderes Gerät mit. **„Alles zurücksetzen“** löscht sie. Im Code und im Repository stehen
keine Noten.

## Regeln und Auslegungen

Die Rechenregeln stammen aus der Präsentation der Schule. Folgende Punkte waren dort nicht eindeutig. So
rechnet die App:

- **Besondere Lernleistung:** Ein Projektkurs als BLL fällt aus Block I heraus. Wie die BLL in Block II
  gewertet wird, bildet der Rechner nicht ab; Block II besteht dann nur aus den 4 Prüfungen, mit Hinweis.
- **0 Punkte:** Kurse mit 0 Punkten werden nie eingebracht. Kommen dadurch keine 35 Kurse zusammen, ist die
  Zulassung nicht möglich.
- **Neu einsetzende Fremdsprache:**
  - Ist die fortgeführte Fremdsprache bis Ende Q2 belegt, sind 4 Kurse davon Pflicht und dazu Q2.1 und Q2.2
    der neuen.
  - Sonst sind 4 Kurse der neuen Fremdsprache Pflicht.
- **„2 Kurse aus …“** (Kunst/Musik/Literatur, Geschichte, Sozialwissenschaften, Religion): Gemeint sind
  beliebige 2 Halbjahre. Der Optimierer nimmt die besten.
- **Projektkurs:** zählt nur gemeinsam als 2 GK. Gibt es nur eine Gesamtnote, trägst du sie in beide
  Halbjahre ein.
- **Sport** hat keine Obergrenze und zählt wie jeder andere Grundkurs.
- **Block I ≥ 200** gilt für den gerundeten Wert. Gerundet wird kaufmännisch und ganzzahlig exakt.
- **Wochenstunden:** Die App kennt sie nicht. Du bestätigst sie per Checkbox; ohne Haken steht
  „zugelassen, sofern Ø 34 Wochenstunden“.

**Warum der Optimierer exakt ist:** Alle Leistungskurse sind als 1./2. Abifach immer Pflicht. Damit zählen alle
frei wählbaren Kurse einfach. Für jede Pflicht-Variante und jede Kursanzahl ist „die besten zuerst“ dann
beweisbar optimal (eine Matroid-Basis-Aufgabe). Diese Wahl maximiert die Punkte und minimiert gleichzeitig die
Defizite. Ein Test vergleicht den Optimierer zusätzlich mit einer unabhängigen Vollsuche: Sie probiert alle
Paar-Kombinationen durch und rechnet die freien Kurse mit exakter dynamischer Programmierung.

## Lokal starten

Voraussetzung ist [Node.js](https://nodejs.org/) 24 (LTS).

```bash
npm install       # Abhängigkeiten installieren
npm run dev       # Entwicklungsserver: http://localhost:5173
npm test          # alle Tests (Vitest)
npm run build     # Produktions-Build nach dist/ (inkl. TypeScript-Prüfung)
npm run preview   # den Build lokal ansehen
```

## Logos

Lege die Dateien selbst in `public/` ab:

- `public/logo-schule.png` – Schullogo. Fehlt die Datei, zeigt die App ein Platzhalter-Wappen.
- `public/logo-erzbistum.png` – optional. Es erscheint nur, wenn die Datei vorhanden ist.

## Veröffentlichung auf GitHub Pages

Bei jedem Push auf `main` läuft der Workflow `.github/workflows/deploy.yml`: Tests, dann Build, dann Deploy.
Den `base`-Pfad (`/<Repo-Name>/`) setzt `vite.config.ts` automatisch aus dem Namen des Repositorys. Einmalig
musst du im Repository unter **Settings → Pages → Source** die Option **„GitHub Actions“** wählen.

## Projektaufbau

```
src/logic/        Rechenlogik ohne React (komplett mit Vitest getestet)
  requirements.ts   Pflicht-Wertungskurse → Varianten
  optimizer.ts      Best-Case-Optimierer Block I
  admission.ts      Zulassungsvoraussetzungen
  blockII.ts        Abiturprüfungen, Nachprüfung, „Was bringt’s?“
  grade.ts          Notentabelle, Änderung der Durchschnittsnote
  targets.ts        Zielnote, nötiger Rest-Schnitt
src/state/        Zustand + localStorage
src/components/   Oberfläche (4 Bereiche)
```
