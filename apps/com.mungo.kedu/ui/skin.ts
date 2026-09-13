// App-local skin.
// Why this file exists: in this host build the per-app Tailwind pass does not emit
// arbitrary values (min-w-[150px]), colour opacity modifiers (bg-card/60) or
// backdrop-blur-*, and it even drops some plain spacing steps (pl-8 on the search input
// silently produced no CSS). So every translucency, blur and any padding I cannot afford
// to lose is declared here against the raw theme tokens, which the host rewrites per
// palette and per light/dark mode.
const ink = (pct: number) => "color-mix(in oklab, var(--foreground) " + String(pct) + "%, transparent)";

export const SKIN = [
  ".kd-card{background-color:color-mix(in oklab, var(--card) 82%, transparent);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}",
  ".kd-card-hi{background-color:color-mix(in oklab, var(--card) 96%, transparent);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}",
  ".kd-row{cursor:pointer;transition:background-color .16s ease}",
  ".kd-row:hover{background-color:" + ink(4) + "}",
  ".kd-row[data-on='true']{background-color:color-mix(in oklab, var(--muted) 62%, transparent)}",
  ".kd-ghost{transition:background-color .16s ease,color .16s ease}",
  ".kd-ghost:hover{background-color:" + ink(5) + "}",
  // a selected control keeps its own fill on hover — these beat ".kd-ghost:hover" on specificity
  ".kd-lit{background-color:var(--foreground);color:var(--background)}",
  ".kd-ghost.kd-lit:hover{background-color:var(--foreground);color:var(--background)}",
  ".kd-ghost.kd-on:hover{background-color:color-mix(in oklab, var(--muted) 72%, transparent);color:var(--foreground)}",
  ".kd-input:focus-visible{border-color:" + ink(30) + "}",
  ".kd-dragging{opacity:.3}",
  ".kd-veil{opacity:0}",
  ".kd-bar-track{background-color:" + ink(10) + "}",
  ".kd-bar-fill{background-color:" + ink(72) + "}",
  // search field: the icon sits at left:10px, so the text needs a guaranteed inset
  // left-2.5 and -translate-y-1/2 silently produced no CSS in this host, which pinned the
  // search icon to the field's left border; the geometry lives here instead
  // the quick-add footer strip keeps a constant height in both states (empty hints vs parse
  // preview) so typing never moves the layout; overflow scrolls sideways instead of wrapping
  ".kd-strip{display:flex;align-items:center;gap:10px;height:36px;padding:0 16px;border-top:1px solid color-mix(in oklab, var(--border) 78%, transparent);background-color:color-mix(in oklab, var(--muted) 45%, transparent)}",
  ".kd-strip-scroll{display:flex;align-items:center;gap:12px;flex:1 1 auto;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}",
  ".kd-strip-scroll::-webkit-scrollbar{display:none}",
  // the quick-add card must paint above the nav/filter rows below it
  ".kd-lift{position:relative;z-index:30}",
  // DSL assist popup
  ".kd-pop{position:absolute;left:0;top:100%;width:max-content;max-width:100%;margin-top:6px;z-index:40;padding:6px;border-radius:14px;border:1px solid color-mix(in oklab, var(--border) 85%, transparent);background-color:color-mix(in oklab, var(--card) 99%, transparent);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);max-height:min(62vh,440px);overflow-y:auto}",
  ".kd-cell{display:inline-flex;align-items:center;gap:8px;padding:5px 10px;border-radius:9px;border:1px solid color-mix(in oklab, var(--border) 70%, transparent);text-align:left;font-size:12.5px;color:var(--muted-foreground);transition:background-color .14s ease,border-color .14s ease,color .14s ease}",
  // content-sized chips that flow: no stretched rows and no dead space at wide widths
  ".kd-chips{display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start;align-items:flex-start;min-width:0}",
  // wide two-pane layout: a compact column of shortcuts whose height matches the calendar
  ".kd-list{display:flex;flex-direction:column;gap:4px;align-items:stretch;width:220px}",
  // drag affordance: faintly visible at rest, full strength on row hover
  ".kd-grip{color:color-mix(in oklab, var(--muted-foreground) 40%, transparent);transition:color .16s ease}",
  ".kd-row:hover .kd-grip{color:var(--muted-foreground)}",
  ".kd-cell:hover{background-color:" + ink(5) + ";color:var(--foreground)}",
  ".kd-cell-on{border-color:color-mix(in oklab, var(--foreground) 55%, transparent);background-color:color-mix(in oklab, var(--muted) 60%, transparent);color:var(--foreground)}",
  // while the input picker is open the rest of the page recedes so the popup never blends in
  ".kd-dim{filter:blur(2.5px);opacity:.4;pointer-events:none;transition:filter .18s ease,opacity .18s ease}",
  // while the dock is open the whole page behind it recedes and stops taking clicks, so the
  // dock is the only thing you can act on (clicking the backdrop closes it when unedited)
  ".kd-recede{filter:blur(4px);opacity:.4;pointer-events:none;transition:filter .22s ease,opacity .22s ease}",
  ".kd-sect{padding:6px 8px 4px;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-foreground)}",
  // a filled badge read as a heavy dark dot; the count is now a quiet muted digit
  // native time inputs used by the detail panel
  // Responsive grids live here, not as Tailwind sm:/md: variants: in the served sheet the
  // plain grid-cols-3 rule lands AFTER the sm: media block, so the variant loses at wide.
  "@media (min-width:640px){.kd-tabs{grid-template-columns:repeat(6,minmax(0,1fr))}}",
  // bottom dock: deliberately NOT a modal sheet — base-ui's sheet always paints a
  // full-screen overlay, which made the view switcher visible but unclickable
  ".kd-dock{position:fixed;left:0;right:0;bottom:0;z-index:45;display:flex;flex-direction:column;max-height:92vh;min-height:62vh;border-top-left-radius:16px;border-top-right-radius:16px;border-top:1px solid color-mix(in oklab, var(--border) 85%, transparent);background-color:color-mix(in oklab, var(--card) 97%, transparent);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);box-shadow:0 -14px 36px -20px var(--shadow)}",
  ".kd-dock-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:45px 24px 36px}",
  // dock body: a writing column plus a properties rail (stacked until there is width)
  ".kd-dock-cols{display:flex;flex-direction:column;gap:40px}",
  // sort lives in ONE joined control instead of four loose chips
  // "just completed" grace: the row stays put and a hairline quietly drains away. Deliberately
  // low-contrast and eased-out so it reads as settling, not as a deadline. 5s = GRACE_MS.
  "@keyframes kd-sweep{from{transform:scaleX(1)}to{transform:scaleX(0)}}",
  // a faint track plus a 2px ink fill, inset from the row edges: one line to read instead of
  // competing with the row's own border, still monochrome and number-free
  // the whole row washes over, then the wash retreats leftwards. No line at all, so it cannot
  // fight the group border, and 6% ink is legible as a receding band without feeling pressing.
  // overdue is marked structurally (a 2px spine) instead of by tinting a whole card red
  // bare "bg-destructive" does not compile here (it resolves to the unset --color-destructive)
  // overdue escalates with magnitude: the row itself gets warmer, and the badge switches from
  // an outline to a solid fill. No extra furniture on the left — that area is already busy.
  // padding + line-height live here: the default line box (1.5em) left ~5px of slack that the
  // font split unevenly, which read as the label not being vertically centred
  // hover dry-run: fade what a filter would remove, without ever blocking the pointer
  ".kd-preview-out{opacity:.28;transition:opacity .22s cubic-bezier(.2,.8,.3,1)}",
  // 贴图: a dashed drop target that takes paste, drop and click; thumbnails open a lightbox
  // the stats tiles: 2-up on narrow, 4-up from 1024px; the two distribution charts go side by side there too
  // right-edge fade: only rendered when the board actually overflows, so "there is more" is visible
  // the board's right edge fades the CONTENT out (a mask, not an overlay) — seamless, and it
  // disappears as soon as the last column is fully in view
  // board edges fade the CONTENT out (masks, not overlays): right while more is off to the
  // right, left once you have scrolled away from the start, both in the middle
  ".kd-mask-right{-webkit-mask-image:linear-gradient(to right, #000 calc(100% - 44px), transparent);mask-image:linear-gradient(to right, #000 calc(100% - 44px), transparent)}",
  ".kd-mask-left{-webkit-mask-image:linear-gradient(to left, #000 calc(100% - 44px), transparent);mask-image:linear-gradient(to left, #000 calc(100% - 44px), transparent)}",
  ".kd-mask-both{-webkit-mask-image:linear-gradient(to right, transparent, #000 44px, #000 calc(100% - 44px), transparent);mask-image:linear-gradient(to right, transparent, #000 44px, #000 calc(100% - 44px), transparent)}",
  ".kd-statgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}",
  ".kd-2col{display:grid;grid-template-columns:minmax(0,1fr);gap:24px}",
  "@media (min-width:1024px){.kd-statgrid{grid-template-columns:repeat(4,minmax(0,1fr))}.kd-2col{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}",
  // the bulk actions are temporary extras: a dashed box on a light wash marks them as such,
  // the same language as the 贴图 drop target
  // the capture bucket at the right edge of the input card. Absolute + z-index, so it needs no
  // change to the card's internals; the card simply yields 66px of padding while it is visible.
  ".kd-inbox-card{padding-right:66px}",
  ".kd-throwchip{position:fixed;top:0;left:0;z-index:80;pointer-events:none;max-width:190px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding:4px 9px;border-radius:8px;border:1px solid color-mix(in oklab, var(--foreground) 22%, transparent);background-color:var(--card);color:var(--foreground);font-size:11.5px;box-shadow:0 8px 24px color-mix(in oklab, var(--foreground) 14%, transparent)}",
  "@keyframes kd-bucket-hit{0%{transform:scale(1)}35%{transform:scale(1.06)}100%{transform:scale(1)}}",
  ".kd-inboxzone-hit{animation:kd-bucket-hit .5s cubic-bezier(.32,.72,.42,.98)}",
  // the envelope flap: hinged along the top edge, folding open while something arrives
  ".kd-mark-lid{transform-origin:50% 30%;transition:transform .3s cubic-bezier(.32,.72,.42,.98)}",
  // a real flap folds BACK over the top; a 2D rotation would swing its wide base sideways, so
  // the fold is simulated by flipping it vertically about the hinge line
  ".kd-inboxzone-hit .kd-mark-lid{transform:scaleY(-0.62)}",
  ".kd-mark-item{opacity:0}",
  "@keyframes kd-item-drop{0%{opacity:0;transform:translate(-7px,-3px) rotate(-14deg)}26%{opacity:1;transform:translate(-2px,2px) rotate(-6deg)}74%{opacity:1;transform:translate(0,7px) rotate(0deg)}100%{opacity:0;transform:translate(0,10px) rotate(0deg)}}",
  ".kd-inboxzone-hit .kd-mark-item{animation:kd-item-drop 1.05s cubic-bezier(.4,.05,.6,.95) forwards}",
  ".kd-triage-veil{position:fixed;inset:0;z-index:54;background-color:color-mix(in oklab, var(--background) 82%, transparent);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}",
  // a TOP drawer, not a bottom sheet: it drops in from above
  ".kd-triage{position:fixed;left:0;right:0;top:0;max-width:1180px;margin:0 auto;z-index:55;display:flex;flex-direction:column;max-height:76vh;border:1px solid color-mix(in oklab, var(--border) 78%, transparent);border-bottom-left-radius:18px;border-bottom-right-radius:18px;background-color:color-mix(in oklab, var(--card) 96%, transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 24px 60px color-mix(in oklab, var(--foreground) 16%, transparent);outline:none;animation:kd-triage-in .44s cubic-bezier(.2,.9,.3,1)}",
  "@keyframes kd-triage-in{from{transform:translateY(-30px);opacity:0}to{transform:translateY(0);opacity:1}}",
  ".kd-triage-head{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid color-mix(in oklab, var(--border) 72%, transparent);color:var(--muted-foreground)}",
  ".kd-triage-progress{position:relative;display:inline-block;width:90px;height:3px;border-radius:2px;background-color:color-mix(in oklab, var(--muted) 70%, transparent);overflow:hidden}"
  ,".kd-triage-progress-fill{position:absolute;left:0;top:0;bottom:0;background-color:var(--foreground);transition:width .25s cubic-bezier(.32,.72,.42,.98)}"
  ,"@keyframes kd-acc-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}"
  ,"@keyframes kd-triage-out{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-18px)}}"
  ,".kd-triage-out{animation:kd-triage-out .18s cubic-bezier(.4,0,.2,1) forwards}"
  ,"@keyframes kd-veil-out{from{opacity:1}to{opacity:0}}"
  ,".kd-triage-veil-out{animation:kd-veil-out .18s cubic-bezier(.4,0,.2,1) forwards}"
  ,".kd-act-on{box-shadow:0 0 0 2px var(--foreground);border-radius:6px;z-index:1}"
  ,".kd-triage-cursor{box-shadow:inset 2px 0 0 var(--foreground)}"
  ,".kd-acc{display:flex;flex-direction:column;gap:12px;padding:12px 12px 14px 12px;border-bottom:1px solid color-mix(in oklab, var(--border) 48%, transparent);background-color:color-mix(in oklab, var(--muted) 34%, transparent);animation:kd-acc-in .26s cubic-bezier(.2,.9,.3,1)}"
  ,".kd-detail-input{width:100%;resize:vertical;border:1px solid color-mix(in oklab, var(--border) 90%, transparent);border-radius:8px;background-color:color-mix(in oklab, var(--card) 92%, transparent);padding:7px 9px;font-family:inherit;font-size:12px;outline:none}"
  ,".kd-detail-input:focus{border-color:var(--foreground)}"
  ,".kd-detail-subs{display:flex;flex-direction:column;gap:4px}"
  ,".kd-detail-sub{display:flex;align-items:center;gap:8px;text-align:left;font-size:12px;color:var(--foreground);padding:3px 0}"
  ,".kd-detail-sub-done{color:var(--muted-foreground)}"
  ,".kd-detail-box{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:4px;border:1px solid color-mix(in oklab, var(--border) 95%, transparent);font-size:9px;line-height:1}"
  ,".kd-detail-sub-done .kd-detail-box{background-color:var(--foreground);color:var(--background);border-color:var(--foreground)}"
  ,".kd-detail-block{display:flex;flex-direction:column;gap:5px}"
  ,".kd-detail-notes{margin:0;font-size:12px;line-height:1.6;color:var(--muted-foreground);white-space:pre-wrap}"
  ,".kd-detail-open{align-self:flex-start;margin-top:6px}"
  ,".kd-seg{display:inline-flex;align-items:stretch;border:1px solid color-mix(in oklab, var(--border) 92%, transparent);border-radius:8px;overflow:hidden}"
  ,".kd-seg-btn{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;line-height:1;padding:5px 9px;color:var(--muted-foreground);border-left:1px solid color-mix(in oklab, var(--border) 60%, transparent);transition:background-color .14s ease,color .14s ease}"
  ,".kd-seg-btn:first-child{border-left:0}"
  ,".kd-seg-standalone{border:1px solid color-mix(in oklab, var(--border) 92%, transparent);border-radius:8px}"
  ,".kd-seg-standalone.kd-lit{border-color:var(--foreground)}"
  ,".kd-seg-btn:hover{color:var(--foreground);background-color:color-mix(in oklab, var(--muted) 60%, transparent)}"
  ,".kd-seg-btn.kd-lit{background-color:var(--foreground);color:var(--background)}"
  ,".kd-triage-hint{margin-top:auto;padding-top:14px;font-size:11px;line-height:1.7;color:var(--muted-foreground)}"
  ,".kd-triage-keys{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:auto;padding-top:14px}"
  ,".kd-triage-key{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;padding:2px 6px;border-radius:5px;border:1px solid color-mix(in oklab, var(--border) 90%, transparent);color:var(--foreground)}"
  ,".kd-triage-keylabel{font-size:10px;color:var(--muted-foreground);margin-right:4px}"
  ,".kd-triage-body{display:flex;flex:1 1 auto;min-height:0}",
  ".kd-triage-list{flex:1 1 auto;min-width:0;overflow-y:auto;padding:8px 8px 16px 16px}",
  ".kd-triage-side{flex:0 0 380px;display:flex;flex-direction:column;gap:10px;padding:14px 16px 16px 16px;border-left:1px solid color-mix(in oklab, var(--border) 70%, transparent);overflow-y:auto}",
  ".kd-triage-side-title{font-size:13.5px;color:var(--foreground);margin-bottom:2px}",
  ".kd-triage-group{display:flex;flex-direction:column;gap:6px}",
  "@media (max-width:819px){.kd-triage-body{flex-direction:column}.kd-triage-side{flex:1 1 auto;border-left:none;border-top:1px solid color-mix(in oklab, var(--border) 70%, transparent)}}",
  ".kd-triage-grouprow{display:flex;flex-wrap:wrap;align-items:center;gap:6px}",
  ".kd-triage-row{display:flex;width:100%;align-items:center;gap:12px;min-height:38px;padding:0 10px;text-align:left;border-bottom:1px solid color-mix(in oklab, var(--border) 48%, transparent)}",
  ".kd-triage-on{background-color:color-mix(in oklab, var(--muted) 55%, transparent)}",
  ".kd-triage-title{flex:1 1 auto;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;text-align:left;font-size:13.5px;color:var(--foreground)}",
  ".kd-triage-chips{display:flex;flex:0 0 auto;align-items:center;gap:6px}",
  ".kd-triage-empty{padding:20px 0;text-align:center;font-size:12.5px;color:var(--muted-foreground)}",
  // the bucket animates in the first time it appears, so the very first capture has a target
  ,"@keyframes kd-zone-in{from{opacity:0;transform:scale(.84)}to{opacity:1;transform:scale(1)}}"
  ,".kd-inboxzone{animation:kd-zone-in .26s cubic-bezier(.2,.9,.3,1);position:absolute;top:-1px;right:-1px;bottom:-1px;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:66px;border-left:1px solid color-mix(in oklab, var(--border) 78%, transparent);border-radius:0 15px 15px 0;background-color:color-mix(in oklab, var(--muted) 30%, transparent);color:var(--muted-foreground);transition:background-color .16s ease,color .16s ease}",
  ".kd-inboxzone:hover{background-color:color-mix(in oklab, var(--muted) 55%, transparent);color:var(--foreground)}",
  // a squared micro-chip with a hairline ring, not a plain pill
  // the badge overhangs the mark by ~8px, so the mark carries an 8px right margin: the pair,
  // not the mark alone, ends up centred in the zone
  ".kd-inboxzone-mark{position:relative;display:inline-flex;margin-right:8px}",
  // the open lid swings past the icon box: let it paint outside instead of being clipped
  ".kd-inboxzone svg{overflow:visible}",
  // the count lives INSIDE the bin and is drawn with the same ink as the mark (currentColor),
  // so it is one object that cannot come apart — and it inverts with the theme by itself
  // a bold corner badge, the way a mail app shows unread — solid ink, thick number, ringed in
  // the card colour so it reads as sitting on top of the pile rather than beside it
  ".kd-inboxzone-badge{position:absolute;top:-7px;right:-8px;display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background-color:var(--foreground);color:var(--background);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums;box-shadow:0 0 0 2.5px color-mix(in oklab, var(--card) 96%, transparent),0 3px 9px color-mix(in oklab, var(--foreground) 24%, transparent)}",
  ".kd-triage-item{display:flex;flex-direction:column}",
  ".kd-triage-more{display:none;align-items:center;gap:6px}",
  ".kd-triage-item.kd-open .kd-triage-more{display:inline-flex}",
  // no dimming: a row that just got classified must not flash darker under the cursor
  ,".kd-triage-done{opacity:1}"
  // fixed one-line meta: adding a tag must never reflow the row
  // every attribute is always visible: the meta keeps its natural width and the title yields
  // (it already ellipsises), so nothing is clipped and the row height stays put
  ,".kd-triage-meta{display:inline-flex;flex:0 0 auto;align-items:center;gap:8px;white-space:nowrap;color:var(--muted-foreground);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px}"
  ,".kd-triage-flag{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;line-height:14px;padding:0 4px;border-radius:4px;border:1px solid color-mix(in oklab, var(--border) 90%, transparent);color:var(--muted-foreground)}",
  ".kd-triage-picker{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:4px 8px 10px 8px}",
  ".kd-triage-newtag{width:118px;border:1px solid color-mix(in oklab, var(--border) 90%, transparent);border-radius:6px;background-color:var(--card);padding:3px 6px;font-size:10.5px;color:var(--foreground);outline:none}",
  ".kd-triage-newtag:focus{border-color:var(--foreground)}",
  ".kd-triage-date{border:1px solid color-mix(in oklab, var(--border) 90%, transparent);border-radius:6px;background-color:var(--card);padding:2px 6px;font-size:10.5px;color:var(--foreground);outline:none}",
  ".kd-bulkbar{display:inline-flex;flex-wrap:wrap;align-items:center;gap:8px;padding:4px 8px;margin:-5px 0;border-radius:10px;border:1px dotted color-mix(in oklab, var(--border) 98%, transparent);background-color:color-mix(in oklab, var(--card) 88%, transparent)}",
  ".kd-drop{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-height:46px;padding:8px 10px;border-radius:10px;border:1px dashed color-mix(in oklab, var(--border) 90%, transparent);background-color:color-mix(in oklab, var(--muted) 28%, transparent);cursor:pointer;transition:border-color .16s ease,background-color .16s ease}",
  ".kd-drop:hover{border-color:color-mix(in oklab, var(--foreground) 32%, transparent);background-color:color-mix(in oklab, var(--muted) 48%, transparent)}",
  ".kd-drop-hint{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;color:var(--muted-foreground)}",
  ".kd-thumb-wrap{position:relative;display:inline-flex}",
  ".kd-thumb{display:block;width:56px;height:56px;border-radius:8px;object-fit:cover;cursor:zoom-in;background-color:color-mix(in oklab, var(--muted) 60%, transparent);border:1px solid color-mix(in oklab, var(--border) 80%, transparent)}",
  ".kd-thumb-x{position:absolute;top:-6px;right:-6px;display:grid;place-items:center;width:18px;height:18px;border-radius:999px;background-color:var(--foreground);color:var(--background);opacity:0;transition:opacity .14s ease}",
  ".kd-thumb-wrap:hover .kd-thumb-x{opacity:1}",
  ".kd-zoom{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:24px;background-color:color-mix(in oklab, var(--background) 90%, transparent);backdrop-filter:blur(6px);cursor:zoom-out}",
  ".kd-zoom-img{max-width:100%;max-height:100%;border-radius:12px;box-shadow:0 18px 60px color-mix(in oklab, var(--foreground) 26%, transparent)}",
  ".kd-sweep{position:absolute;inset:0;transform-origin:left;background-color:color-mix(in oklab, var(--foreground) 6%, transparent);pointer-events:none;transition:transform .12s linear}",
  // the tab bar's baseline: the underline of the active tab sits on this rule
  // wide: tags flush right on the same line as the query controls. narrow: they take their own
  // full-width line, left aligned, so wrapping never staircases out of the segmented control.
  // wide: the tag inventory is shown inline, flush right. narrow: it hides behind the tag button,
  // because on a narrow panel those two extra lines push the actual list off screen.
  ".kd-filterbtn{display:none}",
  // narrow: priority and tags fold behind one button so the search keeps a usable width and the
  // list is not pushed off screen by cold filters
  "@media (max-width:819px){.kd-tabicon{display:none}.kd-filterbtn{display:inline-flex}.kd-filterrow{display:none}.kd-filterrow[data-open='true']{display:flex}}",
  ".kd-seg{display:inline-flex;align-items:stretch;border:1px solid color-mix(in oklab, var(--border) 78%, transparent);border-radius:8px;overflow:hidden}",
  ".kd-seg > button{display:inline-flex;align-items:center;gap:4px;padding:4px 9px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;color:var(--muted-foreground);transition:background-color .14s ease,color .14s ease}",
  ".kd-seg > button + button{border-left:1px solid color-mix(in oklab, var(--border) 78%, transparent)}",
  ".kd-seg > button:hover{background-color:color-mix(in oklab, var(--muted) 60%, transparent);color:var(--foreground)}",
  ".kd-seg > button[data-on='true']{background-color:var(--foreground);color:var(--background)}",
  ".kd-main{display:flex;flex-direction:column;gap:40px;min-width:0}",
  ".kd-rail{display:flex;flex-direction:column;min-width:0}",
  "@media (min-width:820px){.kd-dock-cols{flex-direction:row;align-items:flex-start}.kd-main{flex:1 1 auto}.kd-rail{flex:0 0 auto;width:322px}}",
  "@media (min-width:768px){.kd-detail{grid-template-columns:repeat(2,minmax(0,1fr))}}",
  ".kd-time{height:28px;padding:0 8px;border-radius:8px;border:1px solid color-mix(in oklab, var(--border) 78%, transparent);background-color:transparent;color:var(--foreground);font-family:inherit;font-size:12px;outline:none}",
  ".kd-time:focus-visible{border-color:color-mix(in oklab, var(--foreground) 30%, transparent)}",
].join("");
