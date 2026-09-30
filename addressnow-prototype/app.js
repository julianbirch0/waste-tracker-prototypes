'use strict';
const $ = id => document.getElementById(id);
const definitions = [ ['Company','Company / organisation'], ['Line1','Address line 1'], ['Line2','Address line 2'], ['Line3','Address line 3'], ['Line4','Address line 4'], ['City','Town / city'], ['Province','County'], ['PostalCode','Postcode'], ['CountryName','Country'] ];
const samples = [
 {Company:'Example Recycling Ltd',Line1:'Unit 4',Line2:'Example Business Park',Line3:'Sample Road',Line4:'',City:'Sampletown',Province:'',PostalCode:'AB1 2CD',CountryName:'United Kingdom'},
 {Company:'',Line1:'Example Farm',Line2:'Sample Lane',Line3:'Illustrative Village',Line4:'',City:'Sampletown',Province:'',PostalCode:'AB1 2EF',CountryName:'United Kingdom'}
];
let control = null, libraryPromise = null, edited = false, hasSelection = false;
const key = window.ADDRESSNOW_CONFIG?.key?.trim();
const live = Boolean(key && key !== 'PASTE-YOUR-API-KEY-HERE');
for (const [name,label] of definitions) {
 const wrapper = document.createElement('div');
 if (!['City','Province','PostalCode','CountryName'].includes(name)) wrapper.className='wide';
 const caption = document.createElement('label'); caption.htmlFor=name; caption.textContent=label;
 const input = document.createElement('input'); input.id=name; input.name=name; input.autocomplete='off';
 wrapper.append(caption,input); $('fields').append(wrapper);
}
function values(){return Object.fromEntries(definitions.map(([name])=>[name,$(name).value.trim()]));}
function displayTown(value){
 // Preserve existing mixed case; normalise uniformly upper/lower-case post towns.
 if(value !== value.toUpperCase() && value !== value.toLowerCase()) return value;
 return value.toLowerCase().replace(/(^|[\s-])([a-z])/g,(_,separator,letter)=>separator+letter.toUpperCase());
}
function preview(){
 const v=values();
 const town=displayTown(v.City), postcode=v.PostalCode.toUpperCase();
 const preceding=['Company','Line1','Line2','Line3','Line4'].map(n=>v[n]).filter(Boolean);
 const lines=[...preceding,town,postcode].filter(Boolean);
 $('single').textContent=[...preceding,[town,postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ') || 'Select or enter an address.';
 $('postal').textContent=lines.join('\n') || 'Select or enter an address.';
 $('mapped').textContent=JSON.stringify(v,null,2);
}
function populate(address,sample=false){
 for(const [name] of definitions) $(name).value=address[name] || (name==='PostalCode'?address.Postcode:'') || '';
 $('raw').textContent=JSON.stringify(address,null,2); hasSelection=true;edited=false;
 $('source').textContent=sample?'Sample selected':'Royal Mail selected';
 $('status').textContent=sample?'Sample selected. Edit the fields to explore the previews.':'Address selected. You can edit the details below.';
 preview();
}
$('address-form').addEventListener('submit',e=>e.preventDefault());
$('address-form').addEventListener('input',()=>{edited=true;$('source').textContent=hasSelection?'Edited after selection':'Manually entered';preview();});
function sampleResults(){
 $('sample-results').replaceChildren();const q=$('search').value.toLowerCase().trim();
 for(const a of samples.filter(a=>!q || Object.values(a).join(' ').toLowerCase().includes(q))){
 const b=document.createElement('button');b.textContent=[a.Company,a.Line1,a.City,a.PostalCode].filter(Boolean).join(', ');b.onclick=()=>populate(a,true);$('sample-results').append(b);
 }
 if(!$('sample-results').children.length) $('sample-results').textContent='No sample matches. Try “Example”, “Farm” or “AB1”.';
}
function library(){
 if(libraryPromise)return libraryPromise;
 libraryPromise=new Promise((resolve,reject)=>{
 const css=document.createElement('link');css.rel='stylesheet';css.href='https://api.addressnow.co.uk/css/addressnow-2.30.min.css';document.head.append(css);
 const script=document.createElement('script');script.src='https://api.addressnow.co.uk/js/addressnow-2.30.min.js';
 script.onload=()=>window.pca?.Address?resolve():reject(new Error('AddressNow library unavailable'));
 script.onerror=()=>reject(new Error('AddressNow library unavailable'));document.head.append(script);
 });return libraryPromise;
}
async function initialise(){
 if(!$('suggestions').checkValidity() || !$('results').checkValidity()) { $('suggestions').reportValidity();$('results').reportValidity();return; }
 if(!live){$('status').textContent='Sample mode — add addressnow-config.local.js with your key to enable live lookups.';return;}
 $('apply').disabled=true;$('status').textContent='Loading Royal Mail AddressNow…';
 try{
 await library();if(control)control.destroy();
 // Explicit bindings avoid account-side automatic field detection varying by page.
 const fields=[{element:'search',field:'Label',mode:pca.fieldMode.SEARCH},...definitions.map(([name])=>({element:name,field:name,mode:pca.fieldMode.POPULATE}))];
 control=new pca.Address(fields,{key, name:'WTAddressLab',culture:'en-GB',countries:{codesList:'GB',defaultCode:'GB'},bar:{visible:$('bar').checked,showCountry:false},search:{maxSuggestions:Number($('suggestions').value),maxResults:Number($('results').value)}});
 control.listen('populate',address=>populate(address));
 control.listen('error',()=>{$('status').textContent='Lookup failed. Check the key, URL/security settings, account balance and connection. Manual entry is available.';});
 control.listen('noresults',()=>{$('status').textContent='No addresses found. Try a more specific search or enter the address manually.';});
 $('mode').textContent='Live lookup';$('status').textContent='Ready for live lookup. Start typing a postcode, street or address.';
 }catch(e){$('mode').textContent='Lookup unavailable';$('status').textContent='Could not load AddressNow. Check your connection, then reload. Manual entry is available.';}
 finally{$('apply').disabled=false;}
}
$('apply').onclick=initialise;
$('manual').onclick=()=>{if(control)control.hide();$('source').textContent='Manual entry';$('status').textContent='Enter or amend the address below.';$('Line1').focus();};
$('change').onclick=()=>{
 for(const [name] of definitions)$(name).value='';$('search').value='';$('raw').textContent='No address selected.';hasSelection=false;edited=false;$('source').textContent='Not selected';if(control){control.hide();control.reset();}
 $('status').textContent=live?'Start typing a postcode, street or address.':'Sample mode — select a sample or enter an address manually.';preview();if(!live)sampleResults();$('search').focus();
};
if(!live){$('samples').hidden=false;sampleResults();$('search').addEventListener('input',sampleResults);}
preview();initialise();
