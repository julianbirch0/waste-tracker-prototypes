/*
 * WasteTracker – Round Planning (review build, 6 November 2026).
 * No framework, server, API or internet connection required.
 * The Agreement editor, actual trip scheduling and road routing remain out of scope.
 */
(function () {
  'use strict';
  const data = window.RoundPlanningData;
  if (!data || !Array.isArray(data.rounds) || !Array.isArray(data.agreements)) {
    document.body.textContent = 'Sample data not loaded. Keep data.js alongside index.html.';
    return;
  }
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const WD = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const STORAGE_KEY = 'wastetracker.round-planning.prototype.v2';
  const rows = $('agreement-rows');
  const backdrop = $('modal-backdrop');
  const modal = $('modal');
  const actions = $('modal-actions');
  const msg = $('message');
  let storageAvailable = true;
  let savedOrders = loadOrders();
  let currentRoundId = data.rounds.length ? data.rounds[0].id : '';
  let currentWeek = 1;
  let draft = getOrder(currentRoundId);
  let draggingId = null;
  let dropTarget = null;
  let dropAfter = false;
  let modalMode = '';
  let focusBefore = null;
  let mapVisible = true;
  let mapZoom = 1, mapPanX = 0, mapPanY = 0;
  let mapDrag = null;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function round(id) { return data.rounds.find(r => r.id === id); }
  function agreement(id) { return data.agreements.find(a => a.id === id); }
  function roundTitle(id) { const r = round(id); return r ? r.name + ' – ' + r.days[0] : ''; }
  function mondayUTC(day) {
    const d = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()));
    d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
    return d;
  }
  function weekStart(index) {
    const d = mondayUTC(new Date());
    d.setUTCDate(d.getUTCDate() + (index - 1) * 7);
    return d;
  }
  function labelDate(d) {
    return d.getUTCDate() + '-' + d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  }
  function regularActivities(a) {
    if (Array.isArray(a.activities)) return a.activities.filter(x => x.type === 'regular');
    return [{ type:'regular', roundIds: a.roundIds || [], everyWeeks: 1, startDate: '2020-01-06' }];
  }
  function membership(a, roundId) {
    return regularActivities(a).some(x => Array.isArray(x.roundIds) && x.roundIds.includes(roundId));
  }
  function dueInWeek(a, roundId, week) {
    const r = round(roundId);
    if (!r) return false;
    const dayOffset = WD.indexOf(r.days[0]);
    const targetDate = weekStart(week);
    targetDate.setUTCDate(targetDate.getUTCDate() + dayOffset);
    return regularActivities(a).some(x => {
      if (!Array.isArray(x.roundIds) || !x.roundIds.includes(roundId)) return false;
      const start = new Date((x.startDate || '2020-01-06') + 'T00:00:00Z');
      if (Number.isNaN(start.getTime()) || targetDate < start) return false;
      if (x.endDate && targetDate > new Date(x.endDate + 'T23:59:59Z')) return false;
      const startMonday = mondayUTC(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())));
      const weeks = Math.round((weekStart(week) - startMonday) / 604800000);
      return weeks >= 0 && weeks % Math.max(1, Number(x.everyWeeks) || 1) === 0;
    });
  }
  function visible(a) {
    if (!membership(a, currentRoundId)) return false;
    if (currentWeek === 0) return [1,2,3,4].some(n => dueInWeek(a, currentRoundId, n));
    return dueInWeek(a, currentRoundId, currentWeek);
  }
  function assignedIds(id) { return data.agreements.filter(a => membership(a,id)).map(a => a.id); }
  function loadOrders() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) { storageAvailable = false; return {}; }
  }
  function saveOrders() {
    try {
      if (!storageAvailable) return false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedOrders));
      return true;
    } catch (_) { storageAvailable = false; return false; }
  }
  function getOrder(id) {
    const all = assignedIds(id);
    const previous = savedOrders[id];
    const storedSeq = previous && Array.isArray(previous.sequenced) ? previous.sequenced : null;
    const storedUnseq = previous && Array.isArray(previous.unsequenced) ? previous.unsequenced : null;
    const sequenced = [];
    const unsequenced = [];
    if (storedSeq && storedUnseq) {
      storedSeq.forEach(x => { if (all.includes(x) && !sequenced.includes(x)) sequenced.push(x); });
      storedUnseq.forEach(x => { if (all.includes(x) && !sequenced.includes(x) && !unsequenced.includes(x)) unsequenced.push(x); });
      all.forEach(x => { if (!sequenced.includes(x) && !unsequenced.includes(x)) unsequenced.push(x); });
    } else {
      all.forEach(x => {
        const a = agreement(x);
        (a && a.initiallyUnsequenced ? unsequenced : sequenced).push(x);
      });
    }
    return { sequenced, unsequenced };
  }
  function dirty() { return JSON.stringify(draft) !== JSON.stringify(getOrder(currentRoundId)); }
  function showMessage(t,kind) { msg.textContent = t; msg.dataset.type = kind || 'success'; msg.hidden = false; }
  function clearMessage() { msg.textContent = ''; msg.hidden = true; }
  function setDirty() { $('dirty-indicator').textContent = dirty() ? 'Unsaved changes' : ''; }
  function visibleIds(type) { return draft[type].filter(id => { const a=agreement(id); return a && visible(a); }); }
  function renderControls() {
    const r = round(currentRoundId);
    const names = [...new Set(data.rounds.map(item => item.name))];
    const days = data.rounds.filter(item => r && item.name === r.name)
      .sort((a,b) => WD.indexOf(a.days[0]) - WD.indexOf(b.days[0]));
    const namesHTML = names.map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('');
    const daysHTML = days.map(n => '<option value="' + esc(n.id) + '">' + esc(n.days[0]) + '</option>').join('');
    const weekHTML = [
      ['0','All'],['1','Week 1 - This week'],['2','Week 2 - Next week'],
      ['3','Week 3 - w/c ' + labelDate(weekStart(3))],
      ['4','Week 4 - w/c ' + labelDate(weekStart(4))]
    ].map(([v,label])=>'<option value="' + v + '">' + esc(label) + '</option>').join('');
    ['top','bottom'].forEach(suffix => {
      const rs = $('round-select-' + suffix), ds = $('day-select-' + suffix), ws = $('week-select-' + suffix);
      rs.innerHTML = namesHTML; rs.value = r ? r.name : '';
      ds.innerHTML = daysHTML; ds.value = currentRoundId; ds.disabled = !days.length;
      ws.innerHTML = weekHTML; ws.value = String(currentWeek);
    });
  }
  function sectionHeader(name, type) {
    return '<tr class="section-heading" data-zone="' + type + '"><td colspan="11"><span>' +
      esc(name) + '</span></td></tr>';
  }
  function renderRows(focusId) {
    const unseq = visibleIds('unsequenced');
    const seq = visibleIds('sequenced');
    if (!unseq.length && !seq.length) {
      rows.innerHTML = '<tr><td colspan="11" class="empty-row">No Regular Activities are due for this Round in the selected week. Try All or another week.</td></tr>';
    } else {
      let html = '';
      if (unseq.length) html += sectionHeader('Unsequenced agreements','unsequenced');
      const rowHTML = (id, type) => {
        const a = agreement(id), sequence = draft.sequenced.indexOf(id) + 1;
        const location = [a.location,a.postcode].filter(Boolean).join(', ');
        return '<tr data-agreement-id="' + esc(id) + '" data-section="' + type + '" class="' +
          (type === 'unsequenced' ? 'unsequenced-row' : '') + '">' +
          '<td><button class="drag-handle" type="button" draggable="true" data-action="drag" ' +
          'aria-label="Reorder agreement ' + esc(a.number) + '. Use Up or Down arrow keys." title="Drag to reorder">⠿</button></td>' +
          '<td class="seq">' + (type === 'sequenced' ? sequence : '—') + '</td>' +
          '<td>' + esc(a.number) + '</td><td>' + esc(a.timing) + '</td><td>' + esc(a.customer) + '</td>' +
          '<td><span class="site-line">' + esc(a.site) + '</span><span class="site-sub">' + esc(location) + '</span></td>' +
          '<td>' + esc(a.material) + '</td><td>' + esc(a.container) + '</td>' +
          '<td class="qty">' + esc(a.quantity) + '</td>' +
          '<td class="notes-cell">' + esc(a.notes || '') + '</td>' +
          '<td class="action-cell"><button type="button" class="view-button" data-action="view">View Agreement</button></td></tr>';
      };
      html += unseq.map(id => rowHTML(id,'unsequenced')).join('');
      if (unseq.length) html += sectionHeader('Scheduled agreements','sequenced');
      html += seq.map(id => rowHTML(id,'sequenced')).join('');
      rows.innerHTML = html;
    }
    $('unsequence-drop').hidden = true;
    setDirty();
    renderMap();
    if (focusId) {
      const handle = [...rows.querySelectorAll('[data-action="drag"]')].find(
        e => e.closest('tr').dataset.agreementId === focusId);
      if (handle) handle.focus();
    }
  }
  function persist() {
    savedOrders[currentRoundId] = clone(draft);
    const ok = saveOrders();
    renderRows();
    showMessage(ok ? 'Sequence saved for ' + roundTitle(currentRoundId) + '.' :
      'Saved for this open page only: browser storage is unavailable.',ok?'success':'warning');
  }
  function discard() { draft = getOrder(currentRoundId); clearMessage(); renderRows(); }
  function navigate(rid,week) {
    const changedRound = rid !== currentRoundId || week !== currentWeek;
    currentRoundId=rid; currentWeek=week; draft=getOrder(currentRoundId);
    if (changedRound) { mapZoom=1; mapPanX=0; mapPanY=0; }
    clearMessage(); renderControls(); renderRows();
  }
  function insertBeforeOrAfter(id, target, after) {
    if (!target || id === target) return;
    const type = draft.sequenced.includes(target) ? 'sequenced' : 'unsequenced';
    if (!draft[type].includes(target)) return;
    const firstVisible = visibleIds(type)[0];
    draft.sequenced = draft.sequenced.filter(x => x !== id);
    draft.unsequenced = draft.unsequenced.filter(x => x !== id);
    let pos = draft[type].indexOf(target) + (after ? 1 : 0);
    // Dropping above the first visible sequenced row means #1 in the MASTER list.
    if (!after && type === 'sequenced' && target === firstVisible) pos = 0;
    if (!after && type === 'unsequenced' && target === firstVisible) pos = 0;
    draft[type].splice(pos,0,id);
    clearMessage(); renderRows(id);
  }
  function moveToStart(id,type) {
    draft.sequenced = draft.sequenced.filter(x => x !== id);
    draft.unsequenced = draft.unsequenced.filter(x => x !== id);
    draft[type].unshift(id);
    clearMessage(); renderRows(id);
  }
  function moveByKeyboard(id,delta) {
    const list = visibleIds('unsequenced').concat(visibleIds('sequenced'));
    const i = list.indexOf(id), other = list[i+delta];
    if (!other) return;
    if (delta<0) insertBeforeOrAfter(id,other,false);
    else insertBeforeOrAfter(id,other,true);
  }
  function clearDragStyles() {
    rows.querySelectorAll('.dragging,.drop-before,.drop-after,.drop-zone').forEach(el =>
      el.classList.remove('dragging','drop-before','drop-after','drop-zone'));
    dropTarget=null;
  }
  function beginDrag(id) {
    draggingId=id;
    $('unsequence-drop').hidden=false;
    const tr=rows.querySelector('[data-agreement-id="' + id + '"]');
    if(tr) tr.classList.add('dragging');
  }
  function endDrag() {
    draggingId=null; clearDragStyles(); $('unsequence-drop').hidden=true;
  }
  function modalClose() {
    backdrop.hidden=true; modalMode=''; actions.replaceChildren();
    const old=focusBefore; focusBefore=null; if(old&&old.isConnected) old.focus();
  }
  function modalOpen(title,body,buttons,mode) {
    focusBefore=document.activeElement; modalMode=mode;
    $('modal-title').textContent=title; $('modal-body').innerHTML=body;
    actions.replaceChildren();
    buttons.forEach(b => {
      const btn=document.createElement('button');
      btn.type='button'; btn.className='btn ' + (b.primary?'btn-primary':'btn-secondary');
      btn.textContent=b.label; btn.addEventListener('click',b.run); actions.append(btn);
    });
    backdrop.hidden=false; (actions.querySelector('button') || $('modal-close')).focus();
  }
  function showAgreement(id) {
    const a=agreement(id); if(!a)return;
    const html='<dl class="detail-list">' +
      '<dt>Agreement</dt><dd>' + esc(a.number) + '</dd>' +
      '<dt>Customer</dt><dd>' + esc(a.customer) + '</dd>' +
      '<dt>Site</dt><dd>' + esc(a.site) + '</dd>' +
      '<dt>Location</dt><dd>' + esc([a.location,a.postcode].filter(Boolean).join(', ')) + '</dd>' +
      '<dt>Notes</dt><dd>' + esc(a.notes||'—') + '</dd></dl>' +
      '<p class="modal-help">Preview only. The full Agreements editor has not yet been prototyped. ' +
      'When opened from Round Planning it will return to the same Round, Day and Week after viewing or saving.</p>';
    modalOpen('Agreement ' + a.number,html,[{label:'Return to Planning',primary:true,run:modalClose}],'preview');
  }
  function proceed(action) {
    if(action.type==='selection')navigate(action.id,action.week);
    else if(action.type==='agreement')showAgreement(action.id);
  }
  function guard(action) {
    if(!dirty()) { proceed(action); return; }
    renderControls();
    const body='<p>You have unsaved sequencing changes for <strong>' + esc(roundTitle(currentRoundId)) +
      '</strong>.</p><p class="modal-help">Save or discard them before continuing?</p>';
    modalOpen('Unsaved changes',body,[
      {label:'Cancel',run:modalClose},
      {label:'Discard',run:()=>{modalClose();discard();proceed(action);}},
      {label:'Save',primary:true,run:()=>{modalClose();persist();proceed(action);}}
    ],'guard');
  }
  function setMapVisibility(visible) {
    mapVisible=visible;
    $('map-panel').hidden=!visible;
    $('toggle-map').textContent=visible?'Hide map':'Show map';
    $('toggle-map').setAttribute('aria-expanded',String(visible));
    if(visible)renderMap();
  }
  function mapViewBox() {
    const width=800/mapZoom, height=340/mapZoom;
    return (400-width/2+mapPanX) + ' ' + (170-height/2+mapPanY) + ' ' + width + ' ' + height;
  }
  function renderMap() {
    if(!mapVisible)return;
    const svg=$('planning-map');
    const ids = visibleIds('sequenced').concat(visibleIds('unsequenced'));
    const points = ids.map(id => ({id,a:agreement(id)})).filter(x =>
      x.a && x.a.coordinates && Number.isFinite(x.a.coordinates.lat) && Number.isFinite(x.a.coordinates.lng));
    if(!points.length) {
      svg.innerHTML='<text x="400" y="170" text-anchor="middle" class="map-empty">No locations to show for this selection</text>';
      svg.setAttribute('viewBox',mapViewBox());
      return;
    }
    const lats=points.map(p=>p.a.coordinates.lat), lngs=points.map(p=>p.a.coordinates.lng);
    let south=Math.min(...lats), north=Math.max(...lats), west=Math.min(...lngs), east=Math.max(...lngs);
    if(north-south<0.15){north+=0.075;south-=0.075;}
    if(east-west<0.28){east+=0.14;west-=0.14;}
    const padding=75;
    const coord = p => {
      const xx=padding+(p.a.coordinates.lng-west)/(east-west)*(800-2*padding);
      const yy=padding+(north-p.a.coordinates.lat)/(north-south)*(340-2*padding);
      return {x:xx,y:yy};
    };
    const pathIds=visibleIds('sequenced');
    const scheduled=pathIds.map(id=>points.find(p=>p.id===id)).filter(Boolean);
    let html='<defs><pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">' +
      '<path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e6edf0" stroke-width="1"/></pattern></defs>' +
      '<rect width="800" height="340" fill="#f6faf8"/><rect width="800" height="340" fill="url(#map-grid)"/>' +
      '<path d="M0 90 Q170 55 310 125 T800 110 M0 265 Q240 212 380 260 T800 210" ' +
      'fill="none" stroke="#d5e4e6" stroke-width="12" opacity=".85"/>' +
      '<path d="M80 0 Q200 135 370 175 T730 340" fill="none" stroke="#c9dbe6" stroke-width="4" stroke-dasharray="9 12"/>';
    if(scheduled.length>1) {
      const coords=scheduled.map(p=>coord(p));
      html+='<polyline points="' + coords.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ') +
        '" fill="none" stroke="#208f83" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>';
    }
    points.forEach(p=>{
      const v=coord(p), i=draft.sequenced.indexOf(p.id)+1, unseq=i===0;
      html+='<g class="map-point"><title>' + esc(p.a.number+' – '+p.a.customer+' – '+p.a.site) + '</title>' +
        '<circle cx="'+v.x+'" cy="'+v.y+'" r="16" fill="'+(unseq?'#cf9a54':'#268e83')+
        '" stroke="white" stroke-width="3"/>' +
        (unseq?'<circle cx="'+v.x+'" cy="'+v.y+'" r="4" fill="white"/>':
          '<text x="'+v.x+'" y="'+(v.y+5)+'" text-anchor="middle" fill="white" font-size="13" font-weight="700">'+i+'</text>')+
        '<text x="'+(v.x+20)+'" y="'+(v.y-12)+'" class="map-label">'+esc(p.a.location||p.a.site)+'</text></g>';
    });
    svg.innerHTML=html;
    svg.setAttribute('viewBox',mapViewBox());
  }
  function resetMapZoom() {mapZoom=1;mapPanX=0;mapPanY=0;renderMap();}
  ['top','bottom'].forEach(suffix=>{
    $('round-select-'+suffix).addEventListener('change',event=>{
      const selected=event.target.value, previous=round(currentRoundId), previousDay=previous?previous.days[0]:null;
      const available=data.rounds.filter(r=>r.name===selected).sort((a,b)=>WD.indexOf(a.days[0])-WD.indexOf(b.days[0]));
      const next=available.find(r=>r.days[0]===previousDay)||available[0];
      renderControls();
      if(next)guard({type:'selection',id:next.id,week:currentWeek});
    });
    $('day-select-'+suffix).addEventListener('change',event=>{
      const id=event.target.value;renderControls();
      guard({type:'selection',id,week:currentWeek});
    });
    $('week-select-'+suffix).addEventListener('change',event=>{
      const week=Number(event.target.value);renderControls();
      guard({type:'selection',id:currentRoundId,week});
    });
  });
  rows.addEventListener('click',event=>{
    const btn=event.target.closest('[data-action="view"]');
    if(btn) { const tr=btn.closest('[data-agreement-id]');if(tr)guard({type:'agreement',id:tr.dataset.agreementId}); }
  });
  rows.addEventListener('pointerdown',event=>{
    const h=event.target.closest('[data-action="drag"]');if(h)h.focus();
  });
  rows.addEventListener('keydown',event=>{
    const h=event.target.closest('[data-action="drag"]');
    if(!h || !['ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();moveByKeyboard(h.closest('tr').dataset.agreementId,event.key==='ArrowUp'?-1:1);
  });
  rows.addEventListener('dragstart',event=>{
    const h=event.target.closest('[data-action="drag"]');if(!h){event.preventDefault();return;}
    const tr=h.closest('tr[data-agreement-id]');
    beginDrag(tr.dataset.agreementId);
    event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',draggingId);
  });
  rows.addEventListener('dragover',event=>{
    if(!draggingId)return;
    const tr=event.target.closest('tr[data-agreement-id],tr[data-zone]');
    if(!tr)return;
    event.preventDefault();event.dataTransfer.dropEffect='move';clearDragStyles();
    if(tr.dataset.zone) { dropTarget='zone:'+tr.dataset.zone;tr.classList.add('drop-zone');}
    else {
      dropTarget=tr.dataset.agreementId;
      const b=tr.getBoundingClientRect();dropAfter=event.clientY>=b.top+b.height/2;
      tr.classList.add(dropAfter?'drop-after':'drop-before');
    }
    const origin=rows.querySelector('[data-agreement-id="'+draggingId+'"]');
    if(origin)origin.classList.add('dragging');
  });
  rows.addEventListener('drop',event=>{
    if(!draggingId)return;
    event.preventDefault();
    const id=draggingId,target=dropTarget,after=dropAfter;endDrag();
    if(!target)return;
    if(target.startsWith('zone:'))moveToStart(id,target.slice(5));
    else insertBeforeOrAfter(id,target,after);
  });
  rows.addEventListener('dragend',endDrag);
  $('unsequence-drop').addEventListener('dragover',event=>{
    if(!draggingId)return;event.preventDefault();event.dataTransfer.dropEffect='move';
  });
  $('unsequence-drop').addEventListener('drop',event=>{
    if(!draggingId)return;event.preventDefault();const id=draggingId;endDrag();moveToStart(id,'unsequenced');
  });
  $('toggle-map').addEventListener('click',()=>setMapVisibility(!mapVisible));
  $('map-zoom-in').addEventListener('click',()=>{mapZoom=Math.min(3,mapZoom*1.25);renderMap();});
  $('map-zoom-out').addEventListener('click',()=>{mapZoom=Math.max(1,mapZoom/1.25);renderMap();});
  $('map-zoom-fit').addEventListener('click',resetMapZoom);
  $('planning-map').addEventListener('pointerdown',event=>{
    mapDrag={x:event.clientX,y:event.clientY,panX:mapPanX,panY:mapPanY};
    event.currentTarget.setPointerCapture(event.pointerId);
  });
  $('planning-map').addEventListener('pointermove',event=>{
    if(!mapDrag)return;
    const rect=event.currentTarget.getBoundingClientRect();
    mapPanX=mapDrag.panX-(event.clientX-mapDrag.x)*800/(rect.width*mapZoom);
    mapPanY=mapDrag.panY-(event.clientY-mapDrag.y)*340/(rect.height*mapZoom);
    event.currentTarget.setAttribute('viewBox',mapViewBox());
  });
  ['pointerup','pointercancel'].forEach(name=>$('planning-map').addEventListener(name,()=>{mapDrag=null;}));
  $('save').addEventListener('click',persist);
  $('cancel').addEventListener('click',()=>{
    if(!dirty()){showMessage('There are no unsaved changes to discard.');return;}
    modalOpen('Discard unsaved changes?',
      '<p>Restore the last saved sequence for this Round?</p>',[
        {label:'Keep Editing',run:modalClose},
        {label:'Discard Changes',primary:true,run:()=>{modalClose();discard();showMessage('Unsaved changes discarded.');}}
      ],'cancel');
  });
  $('reset-data').addEventListener('click',()=>{
    if(!window.confirm('Restore all original sample sequences? This clears saved sequence changes.'))return;
    try{localStorage.removeItem(STORAGE_KEY);}catch(_){storageAvailable=false;}
    savedOrders={};draft=getOrder(currentRoundId);renderRows();showMessage('Original sample sequences restored.');
  });
  $('modal-close').addEventListener('click',modalClose);
  backdrop.addEventListener('pointerdown',event=>{if(event.target===backdrop&&modalMode==='preview')modalClose();});
  document.addEventListener('keydown',event=>{
    if(backdrop.hidden)return;
    if(event.key==='Escape'){event.preventDefault();modalClose();}
  });
  window.addEventListener('beforeunload',event=>{
    if(!dirty())return;event.preventDefault();event.returnValue='';
  });
  renderControls();renderRows();setMapVisibility(true);
  if(!storageAvailable)showMessage('Browser storage is unavailable for this local file. Saves will not survive a reload.','warning');
})();
