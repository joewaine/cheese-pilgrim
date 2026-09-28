# Design direction — 25 September 2026

## Brief and decision

Joe requested the exact name **Cheese Pilgrim**, a classical European map feel, cheese + crackers/bread + beverage, a trip organised by origin, concise reviews with photographs and videos capped at one minute, reversible navigation, and a QR-linked book. He then supplied Liam’s supporting image and explicitly requested seed data or a sample persona.

Selected direction: **a quiet European field atlas for a cheese pilgrimage**. The map is the primary instrument; generous serif typography and travel-journal details make it feel like a keepsake. Joe supplied a clear direction, so a three-way visual exploration wasn’t needed.

## Reference evidence

- [Liam’s reference image](https://drive.google.com/file/d/12UMWyDlWwDfgxvEP_pOPtHCbmIUn5BKq/view), fetched and visually inspected. A TasteAtlas cheese map with cheese photographs placed over geographic origins. Preserved privately in `docs/references/liam-cheese.jpg`. The useful principle is geographic discovery. The app redraws its own map and doesn’t republish the original image.
- [TasteAtlas cheese index](https://www.tasteatlas.com/cheese), credited in the app’s philosophy panel as the origin of the supplied reference map.
- [Natural Earth](https://www.naturalearthdata.com/), public-domain geography, distributed via [world-atlas countries-50m](https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json). Rendered with an SVG Mercator projection and visually inspected in the app.
- The app’s desktop and mobile screenshot captures were reviewed together. Country outlines, map hierarchy, side-card cropping, one-column mobile flow, and navigation were evaluated in the finished composition.

## System

- Background: warm paper `#faf8f2`; primary ink and buttons: forest green `#294b3d`.
- Map sea: pale sage `#dde5d6`; land: muted parchment `#f2eedc`; selected stop: brass `#b68a43`.
- Typography: self-hosted Playfair Display for headings and journal passages; self-hosted DM Sans for navigation and controls. Italic serif marks slower, editorial moments. Small capitals are reserved for brief labels.
- Shape: fine borders, restrained 4–6 px corners, small round map pins, a compass rose and a simple cheese mark. Avoid generic dashboard tiles or a dense wall of identical cheese photographs.
- Main hierarchy: brand/navigation → travel invitation → interactive atlas → cheese and pairing details → mini-trips → journal invitation.
- Mobile: map followed by the selected cheese card; single-column trails; collapsible navigation; visible journal access and compact route-edit control. Native dialogs trap focus and close with Escape.
- Motion: short fades and image hover movement; respect reduced-motion settings.
- Printing: A5 pages follow the current route order. Each cheese gets a QR link, pairings, personal notes or writing space, and page numbering. No interface controls are printed.

## Photography and fonts

All photographs are illustrative rather than claims about a named producer or a real visit. Images were downloaded from Unsplash, then inspected. The supplied reference image is not served as part of the public app.

- Cheese wheels: `https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d`
- Alpine lake: `https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1`
- Lavender countryside: `https://images.unsplash.com/photo-1499002238440-d264edd596ec`
- Italian coastal town: `https://images.unsplash.com/photo-1516483638261-f4dbaf036963`
- Paris, used as an illustrative sample-journal image: `https://images.unsplash.com/photo-1502602898657-3e91760cbb34`
- An earlier generic mountain photograph remains as an unused asset (`alps.jpg`); the selected trail uses the Alpine lake.
- Font source: Google Fonts, DM Sans and Playfair Display. License files are bundled alongside the font files.
- Sample video: an original 24-second silent pan across the illustrative cheese photograph, encoded with ffmpeg. English VTT captions explicitly identify the fictional sample. No real traveller is impersonated.

## Content grounding and boundaries

Official visitor links verified on 25 September 2026:

- [Cheddar Gorge Cheese Company](https://www.cheddargorgecheese.com/)
- [La Maison du Comté](https://www.maison-du-comte.com/)
- [Emmentaler Show Dairy](https://www.emmentaler.ch/en/interactive-experiences/emmentaler-show-dairy)
- [La Maison du Gruyère](https://www.lamaisondugruyere.ch/homepage-en/)
- [Roquefort Société caves](https://www.roquefort-societe.com/les-caves/), including the published prohibition on campervan/large-vehicle parking at that venue.
- [Parmigiano Reggiano visit directory](https://www.parmigianoreggiano.com/en-US/dairies-visit-tasting); the map pin is Parma, not an invented producer address.

Other pins are regional discovery locations inspired by the reference. Pairings and descriptions are editorial seed content, not published reviews or assurances of availability. Margot & Jules are fictional. User reviews remain separate and are never silently merged into seed testimonials. The app never presents the nearest-neighbour heuristic as a globally optimal road route.

## Outstanding production decisions

Shared backend/accounts, media storage, comprehensive producer research, routing API, moderation, and a backup import UI remain future work. No bookings were made. At Joe’s subsequent request, the app was renamed **Cheese Pilgrim** and deployed publicly to `https://cheesepilgrim.joewaine.com/` on his existing Hetzner server. Internal IndexedDB/localStorage names retain the old spelling to preserve existing browser data.
