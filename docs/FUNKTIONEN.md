# Lovely — Funktionen und Verfügbarkeit

Dieses Dokument ist die **Soll-Karte**: welche Funktionen die Software hat und **wo** sie erreichbar sein müssen. Gäste sehen nie Edit-/Import-/Settings-UI. Owner nach korrektem Album-Passwort (Session-Cookie) schon.

Referenzalbum: `/portugal-mit-michael`  
Demoalbum (Seed-Layout erlaubt): `/portugal-urlaub`

---

## 1. Oberflächen (Surfaces)

| Surface | URL | Rolle | Zweck |
|---|---|---|---|
| Start | `/` | alle | Neues Album anlegen, Demo öffnen |
| Öffentliche Albumansicht | `/{slug}` oder `/t/{hash}` | Gast: nur ansehen. Owner: Bearbeiten **in-place** nach Passwort | Scrapbook: Hero, Karte, Tage, Lightbox |
| Dedicated Edit-URL | `/{slug}/edit` oder `/t/{hash}/edit` oder `/e/{hash}` | nur Owner (OwnerGate) | dieselbe Albumseite im Edit-Modus |
| Settings / Curation | `/{slug}/settings` oder `/s/{hash}` | nur Owner (OwnerGate) | Google-Import, Tage kuratieren, Highlights, Meta |
| Tagesalbum | `/d/{hash}/{dayId}` | Gast + Owner | alle im Tag ausgewählten Fotos |
| Admin | `/admin` | intern | Liste digitaler Trips |

**Regel:** Funktionen der öffentlichen Albumansicht gelten **identisch** auf der Dedicated-Edit-URL. Settings bleiben eine eigene Vollseite.

Sticky ⋯ oben rechts auf **jeder** Album-/Settings-/Tagesseite (Daumen-tauglich, kein Hover):

| ⋯ Eintrag | Gast | Owner ohne Edit-Modus | Owner im Edit-Modus |
|---|---|---|---|
| Sprache DE/EN | ja | ja | ja |
| Teilen | ja | ja | ja |
| Einstellungen | nein | ja (Session) | ja |
| Bearbeiten | ja → Passwortgate | ja → Edit-Modus **auf dieser Seite** | — |
| Speichern | nein | nein | ja (beendet Edit-Modus; Auto-Save läuft trotzdem) |

Ohne Session: Settings-URLs zeigen nur das Passwortgate, nie die Settings-UI.

---

## 2. Datenmodell (Quelle der Wahrheit)

Zwei Schichten, Postgres + Blob remote, IndexedDB nur Cache.

```
Album (trips)
  name, Ort (Pin + Karte), Passwort, Share-Slug, Google-Album-Links, Sichtbarkeit
  payload.layout  → öffentliche Scrapbook-Präsentation (Blöcke, Rahmen, Texte)
  payload.texts   → i18n-Felder (Titel, Kicker, Jahr, Stempel …)

  Tag (trip_days)
    Datum (title/dateKey), Name, Ort (lat/lng + Label)
    Status: 0 ausgeblendet · 1 Draft · 2 mit öffentlicher Seite synchron

    Foto (photos + day_photos)
      Blob-/Google-URL, EXIF-Zeit, GPS/Ort, googleId
      Status: 0 ausgeblendet · 1 im Tag sichtbar · 2 Highlight
```

- **Katalog** (Settings): alle importierten Fotos, Tage, Orte, Auswahl, Highlights.
- **Layout** (öffentliche Ansicht): nur was aufs Papier kommt — Blöcke, Reihenfolge, Rahmen, Captions, Crop.
- Nach Speichern ist **Remote Quelle der Wahrheit**. Kein stilles Local-only.

Foto-Status und Tag-Status müssen an **Settings und** öffentlicher Ansicht konsistent bleiben (Publish setzt Tag → 2; Highlight bleibt 2 auch wenn der Rahmen später getauscht wird).

---

## 3. Rollen und Flows

### Gast
Share-Link → Scrapbook → optional „Ganzen Tag anzeigen“ → Lightbox. Kein Edit, kein Import, kein Settings.

### Owner
1. Passwort → Session.
2. Öffentliche Seite: Bearbeiten in-place (Blöcke, Fotos, Texte, Orte).
3. Settings: Google-Album verknüpfen/aktualisieren, Tage splitten/mergen, kuratieren, Tag ins Album übernehmen.
4. Speichern / Auto-Save schreibt Katalog **und** Layout.

---

## 4. Funktionskatalog — wo verfügbar

Legende: **Muss** = hier erreichbar und bedienbar (Desktop + Mobil). **Nein** = hier nicht zeigen.

### 4.1 Album-Meta

| Funktion | Öffentliche Ansicht (Edit) | Settings | Tagesalbum | Gast |
|---|---|---|---|---|
| Titel / Kicker / Jahr ändern | Muss (Hero-Texte) | Muss (Titel-Feld) | Nein | Nein |
| Album-Ort (Pin + Overlay-Karte) | Muss (Hero/Ort-Chip) | Muss | Nein | nur Anzeige |
| Passwort setzen/ändern | Nein | Muss | Nein | Nein |
| Share-Link kopieren / native Share | Muss (⋯) | Muss | Muss (⋯) | Muss (⋯) |
| Sprache umschalten + einmalig übersetzen, Cache in DB | Muss (⋯) | Muss (⋯) | Muss (⋯) | Muss (⋯) |

### 4.2 Google Fotos

| Funktion | Öffentliche Ansicht (Edit) | Settings | Gast |
|---|---|---|---|
| Shared-Album-Link einfügen / weiteres Album | Nein (Gear → Settings) | Muss | Nein |
| Album aktualisieren (Merge, NEU-Sticker) | Nein | Muss | Nein |
| Album entfernen (Modal „Wirklich entfernen?“) | Nein | Muss | Nein |
| Voller Import, Pagination, nur Album-Items | — | Muss | — |
| Split nach Capture-Datum + GPS; 10 km / ≥3 Fotos neue Stelle | — | Muss | — |
| Tage mergen (immer, auch bei falschem EXIF) | — | Muss | — |
| Tag splitten (Schere Desktop-Gap / Mobil-Tool) | — | Muss | — |
| Fotos zwischen Tagen verschieben (Drag & Drop) | Nein | Muss | Nein |
| Auswahl: im Tag an/aus, Highlight, Datum, Ort — **sofort speichern** | Nein | Muss | Nein |
| Rasterdichte Sticky-Dock | Nein | Muss | Nein |
| Auge: Abgewählte ausblenden + „N ausgeblendet“-Kachel | Nein | Muss | Nein |
| Tag ausblenden (grau, wieder einblendbar) | Nein | hinter Zahnrad | Nein |
| Tag ins Album übernehmen (Haken) | Nein | Muss, vor Zahnrad | Nein |
| Manuelles Speichern (Diskette im Dock) | Nein | Muss | Nein |

Nach **Tag ins Album übernehmen**: Stempel „Tag X“ in Settings, auf der öffentlichen Seite Tagname + Stempel + Bilder (Highlights in Rahmen; 1 Foto = Einzelbild, mehrere = Collage).

### 4.3 Öffentliche Scrapbook-Seite — Inhalte

Gäste: nur Anzeige + Lightbox + Tageslink. Owner im Edit-Modus: alles unten.

#### Hero (über der Karte)

| Funktion | Muss verfügbar |
|---|---|
| Titelblock editieren | ja |
| Cover-Blöcke wie jeder andere Tag: Foto, Polaroid, Collage, Text, Ort, POI | ja |
| Leerer Hero: Element-Chooser „Element hinzufügen“ | ja |

#### Karte

| Funktion | Gast | Owner-Edit |
|---|---|---|
| Urlaubsroute aus **echten Tagesorten** (keine hardcodierte Porto→Lagos-Linie) | Anzeige | Anzeige |
| Pins tappen → zum Tag scrollen | ja | ja |
| Pin im Edit-Modus → Ort dieses Tages bearbeiten (PlacePicker) | nein | Muss |
| Klebestreifen über der Maske, Outline ohne grauen Rahmen | ja | ja |
| OSM/Stamen Watercolor, **kein** Zoom/Scroll der Karte | ja | ja |

#### Tag-Kopf

| Funktion | Gast | Owner-Edit |
|---|---|---|
| Stempel „TAG / n“ (einzige Nummer, keine zweite „Tag 01“-Zeile) | ja | ja |
| Grüner Typewriter-Titel (Name des Tages) | ja | editierbar |
| Ort-Zeile: Name + Stadt, ohne PLZ/Land | ja | Pin-Chip → PlacePicker |
| Weiteren Ort hinzufügen | nein | Muss |
| Tag löschen (Confirm) | nein | Muss (Zahnrad) |
| „Ganzen Tag anzeigen“ | ja | ja |

#### Blöcke (pro Tag und Hero)

Elemente: **Einzelbild · Polaroid · Collage (2–10) · Text · Ort · POI**.

| Funktion | Wo |
|---|---|
| Element hinzufügen (Chooser „Element hinzufügen“, Lead-in „Was ist an diesem Tag passiert?“) | unter jedem Tag, unter jedem Block (`+` in der Blockleiste), leerer Tag, Hero |
| Block hoch / runter / löschen (Confirm) | an **diesem** Block, nie über Nachbarn |
| Collage-Anzahl +/− | unter der Collage |
| Fotoecken (10 PNG-Styles, klein, TL/TR/BL/BR, alle vier oder Diagonale) | jedes gerahmte Foto |
| Klebestreifen **oder** Ecken **oder** Stempel — nicht alles gleichzeitig; über den weißen Rahmen hinaus | jedes Foto |
| Caption-Zettel unter dem Foto (tucked), eigene Caption pro Foto | jedes Foto mit Text |
| Paper-Flags unter der Caption: ⋯ (Bild ändern / ± Beschreibung / Bild löschen), Format, Rahmen-Recycle, Video-Play (Loop / Boomerang) | Owner-Edit, jedes Foto |
| Crop: Pan im Rahmen + Zoom-Slider volle Breite mit − / + | Owner-Edit, gerahmte Fotos |
| Polaroid-Develop 5 s on-scroll, Reduced-Motion sofort Farbe | Gast + Owner |
| Video: Develop, dann 1 s nach In-View Autoplay | Gast + Owner |
| Textblock: nur Text auf Schreibpapier, 10 Papiere per Recycle | Owner-Edit |
| POI: Places-Suche, Größen 1/2/3, 5 Skins, eigene Caption | Owner-Edit |
| Lightbox: alle Elemente des Tags in Reihenfolge, Swipe, Esc/Backdrop | Gast + Owner; **nicht** beim Scroll-Finger-Down |

### 4.4 Foto in einen Rahmen legen (öffentliche Ansicht, Owner-Edit)

Gilt für **leere und volle** Slots in Einzelbild, Polaroid, Collage, Hero, Default-Tag-Layout.

**a) Highlight-Picker unter dem Rahmen**  
Sobald ein neuer Foto-/Collage-/Polaroid-Slot da ist (auch direkt nach „Element hinzufügen“), erscheinen **unmittelbar unter dem Rahmen** die Highlight-Bilder des Albums (bzw. des Tags, falls der Tag eigene Highlights hat). Tippen weist das Highlight diesem Slot zu. Nicht erst im ⋯-Menü versteckt, nicht nur wenn schon ein Bild im Slot ist.

**b) Plus bleibt Upload**  
Das `+` im leeren Slot lädt **eine Datei** vom Gerät:

1. Bild komprimieren und nach Blob speichern.
2. Ins **verknüpfte Google-Fotos-Album** legen (falls verbunden; sonst nur Blob + Hinweis).
3. Im **Katalog dieses Tags** ablegen (Status sichtbar).
4. Als **Highlight** markieren (Status 2).
5. In **diesen Rahmen** setzen.

Dasselbe Plus existiert in Collage-Kacheln, Einzelbild, Polaroid, Hero. Mehrfach-Upload („Viele Bilder hochladen“) bleibt zusätzlich in Settings; auf der öffentlichen Seite ist Plus = genau dieser eine Slot.

**Ist heute:** Highlights sitzen im ⋯-Menü und nur bei vorhandenem Bild; Plus speichert lokal, ohne Google/Tag/Highlight. Das ist die Lücke — Soll ist a+b oben.

### 4.5 Standard-Erstes-Element eines Tages

Wenn ein Tag **neu auf die öffentliche Seite** kommt (Haken in Settings oder erster Block eines leeren Tages), ist das Default-Layout **nicht** eine nackte Collage, sondern:

```
[ Beschreibung-Zettel ]   [ breites Querformat ]
        (links)            [ quadratisch, nach rechts unten versetzt ]
```

- Links: Scrapbook-Notiz (Schreibpapier) für die Tagesbeschreibung — Text only, recyclebare Papiere.
- Rechts oben: ein **breites** gerahmtes Bild.
- Rechts unten, nach rechts versetzt: ein **quadratisches** Bild.
- Beide Bilder: Highlight-Picker unter dem Rahmen + Plus-Upload wie 4.4.
- Owner kann das Layout danach wie jeden Block umbauen (löschen, weitere Elemente).

### 4.6 Motion, Papier, i18n

| Funktion | Wo |
|---|---|
| Cream-Papier, Azulejos/Sardinhas/Vines/Waves als **Section-Wash** hinter Fotos, hell genug zum Lesen | jeder Tag; nie auf Pixeln |
| `prefers-reduced-motion` | alle Animationen |
| Keine hardcodierten UI-Strings; DE+EN Keys; Auto-Translate nur bei Sprachwechsel und Feldänderung | alle Surfaces |

---

## 5. Code-Landkarte (Ist)

| Bereich | Dateien |
|---|---|
| Öffentliche Seite | `AlbumPage`, `HeroCollage`, `DayBlock`, `BlockStack`, `MapInsert` |
| Edit-Chrome | `AlbumMenu`, `EditUnlock`, `OwnerGate`, `EditGear`, `BlockBar`, `PhotoEditTools` |
| Settings / Curation | `AlbumSettings`, `GoogleImport` |
| Fotos | `Frame`, `Polaroid`, `CollageBlock`, `PhotoStage`, `DevelopingImage`, `PhotoLightbox` |
| State | `src/lib/album/store.ts` |
| Katalog / DB | `catalog.server.ts`, `trips.ts`, `google-import.ts` |
| Layout-Typen | `layout.ts` (`BlockKind`: collage, photo, polaroid, place, note, poi) |
| Routen | `portugal-mit-michael.tsx`, `*.edit.tsx`, `*.edit.settings.tsx`, `t.$hash*`, `d.$hash.$dayId.tsx` |

---

## 6. Checkliste vor einem UI-Change

1. Funktioniert das **ohne Account** auf der Share-URL? (Gast)
2. Ist es nach Passwort auf der **öffentlichen Seite** bedienbar (Mobil-Tap, nicht nur Desktop-Hover)?
3. Liegt Curation (1000 Fotos, Split, Merge, Google) in **Settings**, nicht auf dem Scrapbook?
4. Schreiben wir nach Bestätigen in **Postgres + Blob**, nicht nur IndexedDB?
5. Neue Foto-Slots: **Highlights unter dem Rahmen** und **Plus = Upload → Google + Tag + Highlight**?
6. Neuer Tag: **Notiz links + Querformat + versetztes Quadrat**?
