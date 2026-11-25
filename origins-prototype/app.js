const $=id=>document.getElementById(id);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const icon=(d)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;const right=icon('m9 6 6 6-6 6'),down=icon('m6 9 6 6 6-6'),cross=icon('m6 6 12 12M18 6 6 18');$('clearOrigin').innerHTML=cross;$('comboArrow').innerHTML=down;
const KEY='wt-origins-prototype-v2';const copy=o=>JSON.parse(JSON.stringify(o));let persisted={};try{persisted=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{};let saved=persisted.shortlist&&typeof persisted.shortlist==='object'?persisted.shortlist:{};let draft=copy(saved),expanded=new Set(),selection=persisted.origin||null,open=false,active=-1,shown=[];let toastTimer;function persist(){try{localStorage.setItem(KEY,JSON.stringify({shortlist:saved,origin:selection}));return true}catch{return false}}function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600)}function clean(state){const o={};DATA.forEach(r=>{if(Array.isArray(state[r.name]))o[r.name]=r.wpas.filter(w=>state[r.name].includes(w.name)).map(w=>w.name)});return o}saved=clean(saved);draft=copy(saved);const dirty=()=>JSON.stringify(clean(draft))!==JSON.stringify(saved);const has=(s,r)=>Object.hasOwn(s,r.name);const isW=(s,r,w)=>has(s,r)&&s[r.name].includes(w.name);function toggleRegion(r){if(has(draft,r))delete draft[r.name];else{draft[r.name]=r.wpas.map(w=>w.name);expanded.add(r.name)}renderDict()}function toggleWpa(r,w){if(!has(draft,r))draft[r.name]=[];const a=draft[r.name];draft[r.name]=a.includes(w.name)?a.filter(v=>v!==w.name):[...a,w.name];renderDict()}
function items(s) {
  const result=[];
  for (const r of DATA) {
    if (!has(s,r)) continue;
    const by=new Map();
    function add(x) {
      const previous=by.get(x.value);
      if (!previous) { by.set(x.value,x); return; }
      // A single reporting value can represent multiple levels. Preserve the
      // existing displayed name and placement, while identifying every level.
      const types=[...new Set([...previous.type.split(' + '),...x.type.split(' + ')])];
      const aliases=[...new Set([...(previous.aliases||[]),x.name,...(x.aliases||[])])];
      by.set(x.value,{...previous,type:types.join(' + '),aliases});
    }
    add({value:r.value,name:r.name,type:'Region',level:0,path:r.name});
    for (const w of r.wpas) {
      if (!isW(s,r,w)) continue;
      add({value:w.value,name:w.name,type:'WPA',level:1,path:`${r.name} › ${w.name}`});
      for (const d of w.districts) {
        add({value:d.value,name:d.name,type:'District',level:2,path:`${r.name} › ${w.name} › ${d.name}`});
      }
    }
    result.push(...by.values());
  }
  return result;
}
const countLabel=(n,singular,plural=singular+'s')=>`${n} ${n===1?singular:plural}`;
function renderDict(){const tree=$('tree'),preview=$('preview');const sy=tree.scrollTop,py=preview.scrollTop;const focus=document.activeElement?.dataset?.focus;tree.innerHTML='';for(const r of DATA){let selected=has(draft,r),n=selected?draft[r.name].length:0;const wrap=document.createElement('div');const row=document.createElement('div');row.className='tree-row region';const ex=document.createElement('button');ex.className='expander';ex.innerHTML=r.wpas.length?(expanded.has(r.name)?down:right):'';ex.disabled=!r.wpas.length;ex.setAttribute('aria-label',`${expanded.has(r.name)?'Collapse':'Expand'} ${r.name}`);ex.setAttribute('aria-expanded',expanded.has(r.name));ex.dataset.focus='e'+r.name;ex.onclick=()=>{expanded.has(r.name)?expanded.delete(r.name):expanded.add(r.name);renderDict()};const cb=document.createElement('input');cb.type='checkbox';cb.checked=selected;cb.indeterminate=selected&&n<r.wpas.length;cb.setAttribute('aria-label',r.name);cb.dataset.focus='r'+r.name;cb.onchange=()=>toggleRegion(r);const lab=document.createElement('span');lab.className='tree-label';lab.textContent=r.name;lab.onclick=()=>{if(!selected)toggleRegion(r);else if(r.wpas.length){expanded.has(r.name)?expanded.delete(r.name):expanded.add(r.name);renderDict()}};const ct=document.createElement('span');ct.className='tree-count';ct.textContent=r.wpas.length?`${n}/${countLabel(r.wpas.length,'WPA')}`:'';row.append(ex,cb,lab,ct);wrap.append(row);if(expanded.has(r.name)){const list=document.createElement('div');list.className='wpalist';for(const w of r.wpas){const rr=document.createElement('label');rr.className='tree-row wpa';const c=document.createElement('input');c.type='checkbox';c.checked=isW(draft,r,w);c.setAttribute('aria-label',w.name);c.dataset.focus='w'+r.name+w.name;c.onchange=()=>toggleWpa(r,w);const s=document.createElement('span');s.className='tree-label';s.textContent=w.name;const t=document.createElement('span');t.className='tree-count';t.textContent=w.districts.length?`${w.districts.length} ${w.districts.length===1?'district':'districts'}`:'';rr.append(c,s,t);list.append(rr)}wrap.append(list)}tree.append(wrap)}let nr=0;preview.innerHTML='';for(const r of DATA){if(!has(draft,r))continue;nr++;const g=document.createElement('div');g.className='preview-group';g.innerHTML=`<div class="preview-region"><span>${esc(r.name)}</span><span class="type">Region</span></div>`;for(const w of r.wpas){if(!isW(draft,r,w))continue;g.insertAdjacentHTML('beforeend',`<div class="preview-wpa"><span>${esc(w.name)}</span><span class="type">WPA</span></div>`);for(const d of w.districts){g.insertAdjacentHTML('beforeend',`<div class="preview-district"><span>${esc(d.name)}</span><span class="type">District</span></div>`)}}preview.append(g)}if(!nr)preview.innerHTML=`<div class="empty">${icon('M4 6h16v14H4zM8 3v6m8-6v6M8 13h8')}<strong>Your shortlist is empty</strong>Select a region on the left to get started.</div>`;$('count').textContent=items(draft).length;$('save').disabled=$('discard').disabled=!dirty();$('saveStatus').textContent=dirty()?'Unsaved changes':'No unsaved changes';$('saveStatus').classList.toggle('unsaved',dirty());tree.scrollTop=sy;preview.scrollTop=py;if(focus){const el=[...tree.querySelectorAll('[data-focus]')].find(x=>x.dataset.focus===focus);el?.focus({preventScroll:true})}}
$('all').onclick=()=>{for(const r of DATA)draft[r.name]=r.wpas.map(w=>w.name);renderDict()};$('none').onclick=()=>{draft={};renderDict()};$('collapse').onclick=()=>{expanded.clear();renderDict()};$('discard').onclick=()=>{draft=copy(saved);renderDict();toast('Changes discarded')};$('save').onclick=()=>{saved=clean(draft);draft=copy(saved);const ok=persist();renderDict();toast(ok?'Origins shortlist saved':'Shortlist saved for this session only')};function navigate(to){closeDropdown();$('dict').classList.toggle('hide',to!=='dict');$('intake').classList.toggle('hide',to!=='intake');$('navDict').classList.toggle('active',to==='dict');$('navIntake').classList.toggle('active',to==='intake');$('navDict').setAttribute('aria-current',to==='dict'?'page':'false');$('navIntake').setAttribute('aria-current',to==='intake'?'page':'false');if(to==='intake')renderIntake();else renderDict()};$('navDict').onclick=()=>navigate('dict');$('navIntake').onclick=()=>{
  if (!$('dict').classList.contains('hide') && dirty()) {
    $('unsavedOriginsDialog').showModal();
  } else navigate('intake');
};
$('keepEditingOrigins').onclick=()=>$('unsavedOriginsDialog').close();
$('saveAndLeaveOrigins').onclick=()=>{
  $('save').click();
  $('unsavedOriginsDialog').close();
  navigate('intake');
};
$('discardAndLeaveOrigins').onclick=()=>{
  $('discard').click();
  $('unsavedOriginsDialog').close();
  navigate('intake');
};function renderIntake(){const list=items(saved);if(selection){const current=list.find(x=>x.value===selection.value);if(current)selection={...current};}$('comboValue').textContent=selection?selection.name:'Select origin';$('comboValue').classList.toggle('placeholder',!selection);$('clearOrigin').classList.toggle('hide',!selection);$('selectedDetail').classList.toggle('hide',!selection);if(selection){$('selectedDetail').innerHTML=`<strong>Selected:</strong> ${esc(selection.path)} <span>·</span> ${esc(selection.type)}${list.some(x=>x.value===selection.value)?'':' · No longer in the current shortlist (existing selection retained)'}`;}$('intakeHelp').textContent=list.length?'Select the geographical origin of the waste, at the most detailed level known.':'No origins shortlisted. Go to Company → Dictionaries → Origins to create and save your shortlist.';if(dirty())$('intakeHelp').textContent+=' Unsaved dictionary changes are not included.';}
function showDropdown(){open=true;active=-1;$('dropdown').classList.remove('hide');$('comboValue').setAttribute('aria-expanded','true');$('comboArrow').setAttribute('aria-expanded','true');$('comboArrow').innerHTML=icon('m6 15 6-6 6 6');$('search').value='';renderOptions();$('search').focus()}function closeDropdown(){open=false;$('dropdown').classList.add('hide');$('comboValue').setAttribute('aria-expanded','false');$('comboArrow').setAttribute('aria-expanded','false');$('comboArrow').innerHTML=down}function toggleDropdown(){open?closeDropdown():showDropdown()}$('comboValue').onclick=toggleDropdown;$('comboArrow').onclick=toggleDropdown;$('clearOrigin').onclick=()=>{selection=null;persist();closeDropdown();renderIntake();$('comboValue').focus()};function choose(x){selection=x;persist();closeDropdown();renderIntake();$('comboValue').focus()}function renderOptions(){const q=$('search').value.trim().toLowerCase(),all=items(saved);shown=all.filter(x=>[x.name,x.path,x.value,...(x.aliases||[])].some(s=>s.toLowerCase().includes(q)));active=-1;const target=$('options');target.innerHTML='';for(let i=0;i<shown.length;i++){const x=shown[i],b=document.createElement('button');b.type='button';b.className='option'+(selection?.value===x.value?' selected':'');b.dataset.level=q?0:x.level;b.setAttribute('role','option');b.setAttribute('aria-selected',selection?.value===x.value);b.innerHTML=`<span class="name">${esc(x.name)}${q&&x.level?`<span class="context">${esc(x.path)}</span>`:''}</span><span class="type">${esc(x.type)}</span>${selection?.value===x.value?'✓':''}`;b.onclick=()=>choose(x);target.append(b)}if(!shown.length)target.innerHTML=`<div class="empty" style="padding:20px">${all.length?'No matching origins.':'No origins shortlisted. Save a shortlist in the Origins dictionary.'}</div>`;target.scrollTop=0;$('dropdownFoot').textContent=`${shown.length} ${shown.length===1?'origin':'origins'}${q?' found':' available'}`}
$('search').oninput=renderOptions;$('search').onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!shown.length)return;active=Math.max(0,Math.min(shown.length-1,active+(e.key==='ArrowDown'?1:-1)));const options=[...$('options').querySelectorAll('button')];options.forEach((x,i)=>x.classList.toggle('active',i===active));options[active].scrollIntoView({block:'nearest'})}else if(e.key==='Enter'&&shown.length){e.preventDefault();choose(shown[Math.max(0,active)])}else if(e.key==='Escape'){closeDropdown();$('comboValue').focus()}};document.addEventListener('keydown',e=>{if(open&&e.key==='Escape'){closeDropdown();$('comboValue').focus()}});document.addEventListener('pointerdown',e=>{if(open&&!$('originField').contains(e.target))closeDropdown()});window.addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue=''}});renderDict();

// Keep the dictionary columns stable, using the entire hierarchy rather than
// only the currently expanded or shortlisted rows.
function sizeDictionaryPanels() {
  const fontFamily = getComputedStyle(document.documentElement).fontFamily;
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return;
  const width = (text, size, weight=400) => {
    context.font = `${weight} ${size}px ${fontFamily}`;
    return context.measureText(text).width;
  };
  let treeNameWidth=0, treeCountWidth=0, previewRowWidth=0;
  for (const r of DATA) {
    treeNameWidth=Math.max(treeNameWidth,width(r.name,15,650));
    treeCountWidth=Math.max(treeCountWidth,width(`${r.wpas.length}/${countLabel(r.wpas.length,'WPA')}`,12));
    previewRowWidth=Math.max(previewRowWidth,10+width(r.name,15,750)+10+width('REGION',10,700)+3);
    for (const w of r.wpas) {
      treeNameWidth=Math.max(treeNameWidth,width(w.name,14));
      treeCountWidth=Math.max(treeCountWidth,width(`${w.districts.length} ${w.districts.length===1?'district':'districts'}`,12));
      previewRowWidth=Math.max(previewRowWidth,27+width(w.name,14,650)+9+width('WPA',10,700)+3);
      for (const d of w.districts) {
        previewRowWidth=Math.max(previewRowWidth,51+width(d.name,14)+9+width('DISTRICT',10,700)+5);
      }
    }
  }
  // Row indentation, checkbox/expander, gaps, borders, scrollbars and breathing room.
  const available=Math.ceil(Math.max(310,treeNameWidth+treeCountWidth+126));
  const shortlist=Math.ceil(Math.max(340,previewRowWidth+64));
  const columns=document.querySelector('#dict .columns');
  columns.style.setProperty('--available-width',`${available}px`);
  columns.style.setProperty('--shortlist-width',`${shortlist}px`);
  // Measure all possible dropdown options, not just the saved shortlist.
  const all=items(Object.fromEntries(DATA.map(r=>[r.name,r.wpas.map(w=>w.name)])));
  let originWidth=300;
  for (const x of all) {
    const labelWidth=width(x.name,15,x.level<2?650:400);
    const indentation=[12,27,44][x.level] || 12;
    // Text, type label, indentation, right padding, scrollbar and selected tick.
    const optionWidth=labelWidth+indentation+width(x.type.toUpperCase(),10,700)+82+x.type.length*.45;
    // Also fit the selected value with both the clear and dropdown buttons.
    const valueWidth=width(x.name,15)+116;
    originWidth=Math.max(originWidth,optionWidth,valueWidth);
  }
  $('originField').style.setProperty('--origin-width',`${Math.ceil(originWidth)}px`);
}
sizeDictionaryPanels();
if (document.fonts) document.fonts.ready.then(sizeDictionaryPanels);
