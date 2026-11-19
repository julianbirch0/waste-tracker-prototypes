/*
 * WasteTracker – Round Planning (review build, 19 November 2026).
 * No framework, server, API or internet connection required.
 * The Agreement editor, actual trip scheduling and road routing remain out of scope.
 */
(function () {
  'use strict';
  const data = window.RoundPlanningData;
  if (!data || !Array.isArray(data.rounds) || !Array.isArray(data.agreements) || !Array.isArray(data.services)) {
    document.body.textContent = 'Sample data not loaded. Keep data.js alongside index.html.';
    return;
  }
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const WD = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const STORAGE_KEY = 'wastetracker.round-planning.prototype.v3';
  const rows = $('agreement-rows');
  const tableScroll = $('table-scroll');
  const table = document.querySelector('.planning-table');
  const undoButton = $('undo');
  const redoButton = $('redo');
  const MAX_HISTORY = 100;
  let undoStack = [], redoStack = [];
  let selectedIds = new Set();
  let selectionAnchor = null;
  let pointerStart = null, liveDrag = null, dropHint = null, dragBadge = null;
  let suppressClick = false, autoScrollHandle = null;
  let lastPointer = null;
  const backdrop = $('modal-backdrop');
  const modal = $('modal');
  const actions = $('modal-actions');
  const msg = $('message');
  let storageAvailable = true;
  let savedOrders = loadOrders();
  // Agreements' View Round links pass the parent Round name via the URL.
  // Default to its first day-specific Round; the user can then choose a day.
  const requestedRound = new URLSearchParams(window.location.search).get('round');
  const linkedRound = requestedRound && data.rounds.find(r =>
    r.name.toLowerCase() === requestedRound.toLowerCase() || r.id === requestedRound
  );
  let currentRoundId = linkedRound ? linkedRound.id : (data.rounds.length ? data.rounds[0].id : '');
  let currentWeek = 1;
  let draft = getOrder(currentRoundId);
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
  function service(id) { return data.services.find(s => s.id === id); }
  function parentAgreement(s) { return s && data.agreements.find(a => a.id === s.agreementId); }
  function membership(s, roundId) {
    return Boolean(s && Array.isArray(s.roundIds) && s.roundIds.includes(roundId));
  }
  function hasEnded(s) {
    const today = new Date(), todayKey = today.getFullYear() + '-' +
      String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    return Boolean(s.endDate && s.endDate < todayKey);
  }
  function dueInWeek(s, roundId, week) {
    const r = round(roundId);
    if (!r || !membership(s,roundId)) return false;
    const dayOffset = WD.indexOf(r.days[0]);
    const targetDate = weekStart(week);
    targetDate.setUTCDate(targetDate.getUTCDate() + dayOffset);
    const start = new Date((s.startDate || '2020-01-06') + 'T00:00:00Z');
    if (Number.isNaN(start.getTime()) || targetDate < start) return false;
    if (s.endDate && targetDate > new Date(s.endDate + 'T23:59:59Z')) return false;
    const startMonday = mondayUTC(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())));
    const weeks = Math.round((weekStart(week) - startMonday) / 604800000);
    return weeks >= 0 && weeks % Math.max(1,Number(s.everyWeeks)||1) === 0;
  }
  function visible(s) {
    if (!membership(s,currentRoundId) || hasEnded(s)) return false;
    // All means all current and future Regular Services, not only 4 weeks.
    // On-hold Services continue following recurrence for week-specific views.
    return currentWeek === 0 || dueInWeek(s,currentRoundId,currentWeek);
  }
  function assignedIds(id) {
    // Keep ended Services in the persisted master sequence, but hide them.
    return data.services.filter(s => membership(s,id)).map(s => s.id);
  }
  function frequencyLabel(s) {
    const every = Math.max(1,Number(s.everyWeeks)||1);
    return every===1 ? 'Weekly' : 'Every ' + every + ' weeks';
  }
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
    const all = assignedIds(id), previous = savedOrders[id];
    const storedSeq = previous && Array.isArray(previous.sequenced) ? previous.sequenced : null;
    const storedUnseq = previous && Array.isArray(previous.unsequenced) ? previous.unsequenced : null;
    const sequenced=[], unsequenced=[];
    if (storedSeq && storedUnseq) {
      storedSeq.forEach(x => { if (all.includes(x) && !sequenced.includes(x)) sequenced.push(x); });
      storedUnseq.forEach(x => { if (all.includes(x) && !sequenced.includes(x) && !unsequenced.includes(x)) unsequenced.push(x); });
      all.forEach(x => { if (!sequenced.includes(x) && !unsequenced.includes(x)) unsequenced.push(x); });
    } else {
      all.forEach(x => (service(x).initiallySequenced ? sequenced : unsequenced).push(x));
    }
    return {sequenced,unsequenced};
  }
  function dirty() { return JSON.stringify(draft) !== JSON.stringify(getOrder(currentRoundId)); }
  function showMessage(t,kind) { msg.textContent=t;msg.dataset.type=kind||'success';msg.hidden=false; }
  function clearMessage() { msg.textContent='';msg.hidden=true; }
  function setDirty() { $('dirty-indicator').textContent=dirty()?'Unsaved changes':''; }
  function visibleIds(type) { return draft[type].filter(id => {const s=service(id);return s&&visible(s);}); }
  function visibleOrder() { return visibleIds('unsequenced').concat(visibleIds('sequenced')); }
  function clearSelection() {
    selectedIds.clear();selectionAnchor=null;refreshSelection();
  }
  function refreshSelection() {
    rows.querySelectorAll('tr[data-service-id]').forEach(tr => {
      const active=selectedIds.has(tr.dataset.serviceId);
      tr.classList.toggle('is-selected',active);
      tr.setAttribute('aria-selected',String(active));
    });
    $('selection-count').textContent=selectedIds.size ?
      selectedIds.size+' service'+(selectedIds.size===1?'':'s')+' selected' : '';
    renderMap();
  }
  function selectService(id,modifiers) {
    const order=visibleOrder();
    if (!order.includes(id)) return;
    const anchor=selectionAnchor;
    if (modifiers.shiftKey && anchor && order.includes(anchor)) {
      if (!modifiers.ctrlKey && !modifiers.metaKey) selectedIds.clear();
      const a=order.indexOf(anchor),b=order.indexOf(id);
      order.slice(Math.min(a,b),Math.max(a,b)+1).forEach(x=>selectedIds.add(x));
    } else if (modifiers.ctrlKey || modifiers.metaKey) {
      if(selectedIds.has(id))selectedIds.delete(id);else selectedIds.add(id);
      selectionAnchor=id;
    } else {
      selectedIds=new Set([id]);selectionAnchor=id;
    }
    refreshSelection();
  }
  function clearHistory() {undoStack=[];redoStack=[];updateHistoryButtons();}
  function updateHistoryButtons() {
    undoButton.disabled=!undoStack.length;
    redoButton.disabled=!redoStack.length;
  }
  function commitEdit(before) {
    if(JSON.stringify(before)===JSON.stringify(draft))return false;
    undoStack.push({before,after:clone(draft)});
    if(undoStack.length>MAX_HISTORY)undoStack.shift();
    redoStack=[];updateHistoryButtons();
    clearMessage();renderRows();return true;
  }
  function stepHistory(direction) {
    const source=direction==='undo'?undoStack:redoStack;
    const destination=direction==='undo'?redoStack:undoStack;
    if(!source.length)return;
    const entry=source.pop();
    draft=clone(entry[direction==='undo'?'before':'after']);
    destination.push(entry);
    selectedIds=new Set([...selectedIds].filter(id=>visibleOrder().includes(id)));
    updateHistoryButtons();clearMessage();renderRows();
  }
  function updateStickyOffsets() {
    if(!tableScroll)return;
    let top=table.tHead.getBoundingClientRect().height;
    rows.querySelectorAll('tr[data-zone="unsequenced"],tr.unsequenced-row').forEach(tr=>{
      tr.style.setProperty('--sticky-top',top+'px');
      top+=tr.getBoundingClientRect().height;
    });
    tableScroll.style.setProperty('--sticky-stack-height',top+'px');
  }
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
  function sectionHeader(name,type) {
    return '<tr class="section-heading" data-zone="'+type+'"><td colspan="10"><span>'+
      esc(name)+'</span></td></tr>';
  }
  function renderRows(focusId) {
    const unseq=visibleIds('unsequenced'), seq=visibleIds('sequenced');
    if(!unseq.length&&!seq.length) {
      rows.innerHTML='<tr><td colspan="10" class="empty-row">No Regular Services are due for this Round in the selected week. Try All or another week.</td></tr>';
    } else {
      const rowHTML=(id,type,index)=>{
        const s=service(id),a=parentAgreement(s);
        if(!s||!a)return '';
        const location=[a.location,a.postcode].filter(Boolean).join(', ');
        const held=s.onHold?'<span class="hold-label">On hold</span>':'';
        const description='<strong>'+esc(s.activity)+'</strong><span class="service-frequency">'+esc(frequencyLabel(s))+'</span>'+held;
        return '<tr tabindex="0" data-service-id="'+esc(id)+'" data-section="'+type+'" aria-selected="'+selectedIds.has(id)+
          '" class="'+(type==='unsequenced'?'unsequenced-row ':'')+(s.onHold?'on-hold-row ':'')+
          (selectedIds.has(id)?'is-selected':'')+'">'+
          '<td class="seq">'+(type==='sequenced'?index+1:'—')+'</td>'+
          '<td class="service-description">'+description+'</td>'+
          '<td>'+esc(s.timing||a.timing)+'</td><td>'+esc(a.customer)+'</td>'+
          '<td><span class="site-line">'+esc(a.site)+'</span><span class="site-sub">'+esc(location)+'</span></td>'+
          '<td>'+esc(a.material)+'</td><td>'+esc(s.container||a.container)+'</td>'+
          '<td class="qty">'+esc(s.quantity)+'</td>'+
          '<td class="notes-cell">'+esc(s.notes||a.notes||'')+'</td>'+
          '<td class="action-cell"><button type="button" class="view-button" data-action="view">View Agreement</button></td></tr>';
      };
      let html='';
      if(unseq.length)html+=sectionHeader('Unsequenced services','unsequenced');
      html+=unseq.map((id,index)=>rowHTML(id,'unsequenced',index)).join('');
      if(unseq.length)html+=sectionHeader('Sequenced services','sequenced');
      html+=seq.map((id,index)=>rowHTML(id,'sequenced',index)).join('');
      rows.innerHTML=html;
    }
    $('unsequence-drop').hidden=true;
    setDirty();
    applyColumnVisibility();
    refreshSelection();
    updateStickyOffsets();
    if(focusId){
      const tr=[...rows.querySelectorAll('tr[data-service-id]')].find(e=>e.dataset.serviceId===focusId);
      if(tr)tr.focus({preventScroll:true});
    }
  }
  function persist() {
    savedOrders[currentRoundId]=clone(draft);
    const ok=saveOrders();
    clearHistory();
    renderRows();
    showMessage(ok?'Sequence saved for '+roundTitle(currentRoundId)+'.':
      'Saved for this open page only: browser storage is unavailable.',ok?'success':'warning');
  }
  function discard() {
    draft=getOrder(currentRoundId);clearHistory();clearSelection();clearMessage();renderRows();
  }
  function navigate(rid,week) {
    const changed=rid!==currentRoundId||week!==currentWeek;
    currentRoundId=rid;currentWeek=week;draft=getOrder(currentRoundId);
    if(changed){mapZoom=1;mapPanX=0;mapPanY=0;}
    selectedIds.clear();selectionAnchor=null;clearHistory();
    clearMessage();renderControls();renderRows();
    tableScroll.scrollTop=0;
  }
  function moveSelected(target,after,zone) {
    const before=clone(draft);
    const moving=before.unsequenced.concat(before.sequenced).filter(id=>selectedIds.has(id));
    if(!moving.length)return false;
    const type=zone||(draft.sequenced.includes(target)?'sequenced':'unsequenced');
    if(!['sequenced','unsequenced'].includes(type)||target&&moving.includes(target))return false;
    const firstVisible=visibleIds(type).find(id=>!selectedIds.has(id));
    draft.sequenced=draft.sequenced.filter(id=>!selectedIds.has(id));
    draft.unsequenced=draft.unsequenced.filter(id=>!selectedIds.has(id));
    let position=0;
    if(target){
      position=draft[type].indexOf(target);
      if(position<0){draft=before;return false;}
      if(after)position+=1;
      if(!after&&target===firstVisible)position=0;
    }
    draft[type].splice(position,0,...moving);
    return commitEdit(before);
  }
  function moveByKeyboard(id,delta) {
    if(!selectedIds.has(id)){selectedIds=new Set([id]);selectionAnchor=id;}
    const list=visibleOrder(),i=list.indexOf(id),other=list[i+delta];
    if(!other||selectedIds.has(other))return;
    moveSelected(other,delta>0);
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
    const a=parentAgreement(service(id)); if(!a)return;
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
    const points = ids.map(id => ({id,s:service(id),a:parentAgreement(service(id))})).filter(x =>
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
    const visibleSeq=visibleIds('sequenced');
    points.forEach(p=>{
      const v=coord(p), i=visibleSeq.indexOf(p.id)+1, unseq=i===0;
      const held=p.s.onHold, selected=selectedIds.has(p.id);
      const fill=unseq?'#cf9a54':held?'#708d98':'#268e83';
      const title=p.s.activity+' · '+frequencyLabel(p.s)+' – '+p.a.customer+' – '+p.a.site+
        (held?' (On hold)':'')+'. Click to locate in the table.';
      html+='<g class="map-point'+(selected?' is-selected':'')+(held?' is-on-hold':'')+
        '" data-map-service="'+esc(p.id)+'" tabindex="0" role="button" aria-label="'+esc(title)+'">'+
        '<title>'+esc(title)+'</title>'+
        '<circle cx="'+v.x+'" cy="'+v.y+'" r="16" fill="'+fill+
        '" stroke="'+(selected?'#154f68':'white')+'" stroke-width="'+(selected?'5':'3')+'"/>'+
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
  function revealService(id) {
    const s=service(id);
    if(!s||!visible(s))return;
    selectedIds=new Set([id]);selectionAnchor=id;
    refreshSelection();
    const row=[...rows.querySelectorAll('tr[data-service-id]')].find(tr=>tr.dataset.serviceId===id);
    if(!row)return;
    const rect=row.getBoundingClientRect(), viewport=tableScroll.getBoundingClientRect();
    const stack=parseFloat(tableScroll.style.getPropertyValue('--sticky-stack-height'))||40;
    const top=tableScroll.scrollTop+rect.top-viewport.top-Math.min(stack+12,viewport.height*0.55);
    if(row.dataset.section==='unsequenced')tableScroll.scrollTo({top:0,behavior:'smooth'});
    else tableScroll.scrollTo({top:Math.max(0,top),behavior:'smooth'});
    tableScroll.scrollIntoView({behavior:'smooth',block:'nearest'});
    row.focus({preventScroll:true});
  }

  function clearDropHint() {
    rows.querySelectorAll('.drop-before,.drop-after,.drop-zone').forEach(el=>
      el.classList.remove('drop-before','drop-after','drop-zone'));
    $('unsequence-drop').classList.remove('is-drop-target');
    dropHint=null;
  }
  function updateDropHint(x,y) {
    clearDropHint();
    const hit=document.elementFromPoint(x,y);
    if(!hit)return;
    const unseqDrop=hit.closest('#unsequence-drop');
    if(unseqDrop&&!unseqDrop.hidden) {
      dropHint={zone:'unsequenced'};
      unseqDrop.classList.add('is-drop-target');
      return;
    }
    const tr=hit.closest('tr[data-service-id],tr[data-zone]');
    if(!tr||!rows.contains(tr))return;
    if(tr.dataset.zone){
      dropHint={zone:tr.dataset.zone};
      tr.classList.add('drop-zone');
    } else if(!selectedIds.has(tr.dataset.serviceId)) {
      const rect=tr.getBoundingClientRect();
      const after=y>rect.top+rect.height/2;
      dropHint={target:tr.dataset.serviceId,after};
      tr.classList.add(after?'drop-after':'drop-before');
    }
  }
  function startPointerDrag(event) {
    const id=pointerStart.id;
    if(!selectedIds.has(id)){selectedIds=new Set([id]);selectionAnchor=id;refreshSelection();}
    liveDrag={pointerId:pointerStart.pointerId};
    document.body.classList.add('dragging-services');
    rows.querySelectorAll('tr.is-selected').forEach(tr=>tr.classList.add('dragging'));
    $('unsequence-drop').hidden=false;
    dragBadge=document.createElement('div');
    dragBadge.className='drag-badge';
    dragBadge.textContent=selectedIds.size+' service'+(selectedIds.size===1?'':'s');
    document.body.appendChild(dragBadge);
    lastPointer={x:event.clientX,y:event.clientY};
    moveDragBadge(event.clientX,event.clientY);
    startAutoScroll();
  }
  function moveDragBadge(x,y) {
    if(dragBadge){dragBadge.style.left=x+15+'px';dragBadge.style.top=y+16+'px';}
  }
  function startAutoScroll() {
    if(autoScrollHandle!==null)return;
    const frame=()=>{
      if(!liveDrag){autoScrollHandle=null;return;}
      if(lastPointer){
        const rect=tableScroll.getBoundingClientRect(),y=lastPointer.y,x=lastPointer.x;
        if(x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom){
          const margin=64;
          const delta=y>rect.bottom-margin?Math.min(24,(y-(rect.bottom-margin))*0.4):
            y<rect.top+margin?-Math.min(24,((rect.top+margin)-y)*0.4):0;
          if(delta){tableScroll.scrollTop+=delta;updateDropHint(x,y);}
        }
      }
      autoScrollHandle=window.requestAnimationFrame(frame);
    };
    autoScrollHandle=window.requestAnimationFrame(frame);
  }
  function finishPointerDrag(cancel) {
    const hint=cancel?null:dropHint;
    pointerStart=null;liveDrag=null;lastPointer=null;
    if(autoScrollHandle!==null){window.cancelAnimationFrame(autoScrollHandle);autoScrollHandle=null;}
    document.body.classList.remove('dragging-services');
    if(dragBadge){dragBadge.remove();dragBadge=null;}
    rows.querySelectorAll('.dragging').forEach(el=>el.classList.remove('dragging'));
    $('unsequence-drop').hidden=true;
    clearDropHint();
    if(hint)moveSelected(hint.target||null,!!hint.after,hint.zone||null);
  }
  rows.addEventListener('click',event=>{
    if(suppressClick){suppressClick=false;return;}
    const btn=event.target.closest('[data-action="view"]');
    if(btn){
      const tr=btn.closest('tr[data-service-id]');
      if(tr)guard({type:'agreement',id:tr.dataset.serviceId});
      return;
    }
    const tr=event.target.closest('tr[data-service-id]');
    if(tr)selectService(tr.dataset.serviceId,event);
  });
  rows.addEventListener('pointerdown',event=>{
    const tr=event.target.closest('tr[data-service-id]');
    if(!tr||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||
        event.target.closest('button,input,a,select'))return;
    pointerStart={id:tr.dataset.serviceId,pointerId:event.pointerId,x:event.clientX,y:event.clientY};
  });
  document.addEventListener('pointermove',event=>{
    if(!pointerStart||event.pointerId!==pointerStart.pointerId)return;
    if(!liveDrag&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>7){
      startPointerDrag(event);
    }
    if(liveDrag){
      event.preventDefault();
      lastPointer={x:event.clientX,y:event.clientY};
      moveDragBadge(event.clientX,event.clientY);
      updateDropHint(event.clientX,event.clientY);
    }
  },{passive:false});
  document.addEventListener('pointerup',event=>{
    if(!pointerStart||event.pointerId!==pointerStart.pointerId)return;
    if(liveDrag){
      suppressClick=true;
      // The synthetic click follows pointerup. If nothing generates a click,
      // release suppression before the next genuine user interaction.
      window.setTimeout(()=>{suppressClick=false;},0);
      finishPointerDrag(false);
      event.preventDefault();
    }else pointerStart=null;
  });
  document.addEventListener('pointercancel',()=>{
    if(liveDrag)finishPointerDrag(true);
    pointerStart=null;
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&liveDrag){event.preventDefault();finishPointerDrag(true);return;}
    if(!backdrop.hidden)return;
    const ctrl=event.ctrlKey||event.metaKey;
    if(ctrl&&['z','y'].includes(event.key.toLowerCase())){
      event.preventDefault();
      stepHistory(event.key.toLowerCase()==='y'||event.shiftKey?'redo':'undo');
    }else if(ctrl&&event.key.toLowerCase()==='a'&&tableScroll.contains(document.activeElement)){
      event.preventDefault();selectedIds=new Set(visibleOrder());refreshSelection();
    }else if(event.key==='Escape'&&selectedIds.size){clearSelection();}
  });
  rows.addEventListener('keydown',event=>{
    const tr=event.target.closest('tr[data-service-id]');
    if(!tr||event.target.closest('button'))return;
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();selectService(tr.dataset.serviceId,event);
    }else if(event.altKey&&['ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();moveByKeyboard(tr.dataset.serviceId,event.key==='ArrowUp'?-1:1);
    }
  });
  undoButton.addEventListener('click',()=>stepHistory('undo'));
  redoButton.addEventListener('click',()=>stepHistory('redo'));
  $('toggle-map').addEventListener('click',()=>setMapVisibility(!mapVisible));
  $('map-zoom-in').addEventListener('click',()=>{mapZoom=Math.min(3,mapZoom*1.25);renderMap();});
  $('map-zoom-out').addEventListener('click',()=>{mapZoom=Math.max(1,mapZoom/1.25);renderMap();});
  $('map-zoom-fit').addEventListener('click',resetMapZoom);
  $('planning-map').addEventListener('pointerdown',event=>{
    if(event.target.closest('[data-map-service]'))return;
    mapDrag={x:event.clientX,y:event.clientY,panX:mapPanX,panY:mapPanY};
    event.currentTarget.setPointerCapture(event.pointerId);
  });
  $('planning-map').addEventListener('click',event=>{
    const marker=event.target.closest('[data-map-service]');
    if(marker)revealService(marker.dataset.mapService);
  });
  $('planning-map').addEventListener('keydown',event=>{
    const marker=event.target.closest('[data-map-service]');
    if(marker&&['Enter',' '].includes(event.key)){
      event.preventDefault();revealService(marker.dataset.mapService);
    }
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
    savedOrders={};draft=getOrder(currentRoundId);clearHistory();clearSelection();
    renderRows();tableScroll.scrollTop=0;
    showMessage('Original sample sequences restored.');
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

  // Column visibility is a display preference, not a change to Agreement data.
  const columnIndexes = {timing:3,material:6,container:7,quantity:8,notes:9};
  const visibleColumns = {timing:true,material:true,container:true,quantity:true,notes:true};
  function applyColumnVisibility() {
    Object.keys(columnIndexes).forEach(key => {
      const n=columnIndexes[key];
      document.querySelectorAll('.planning-table col:nth-child('+n+'), .planning-table tr > :nth-child('+n+')')
        .forEach(el => {el.hidden=!visibleColumns[key];});
    });
  }
  $('columns-toggle').addEventListener('click',()=>{
    const panel=$('columns-panel');
    panel.hidden=!panel.hidden;
    $('columns-toggle').setAttribute('aria-expanded',String(!panel.hidden));
  });
  $('columns-panel').addEventListener('change',event=>{
    const checkbox=event.target.closest('input[data-column]');
    if(!checkbox)return;
    visibleColumns[checkbox.dataset.column]=checkbox.checked;
    applyColumnVisibility();
  });

  renderControls();renderRows();setMapVisibility(true);
  window.addEventListener('resize',updateStickyOffsets);
  updateHistoryButtons();
  if(!storageAvailable)showMessage('Browser storage is unavailable for this local file. Saves will not survive a reload.','warning');
})();
