// Active le mode strict : JavaScript signale certaines erreurs de programmation.
'use strict';
// Raccourci pour retrouver un élément HTML par son attribut id.
const $=id=>document.getElementById(id);
// Choisit un élément au hasard dans un tableau.
const pick=a=>a[randomIndex(a.length)];
// Produit un indice entre 0 et n-1 avec crypto.getRandomValues. Le rejet des valeurs au-delà de limit évite le biais du modulo.
function randomIndex(n){if(!Number.isInteger(n)||n<1)throw Error('Liste vide');const b=new Uint32Array(1),limit=Math.floor(2**32/n)*n;do{crypto.getRandomValues(b)}while(b[0]>=limit);return b[0]%n;}
// Normalise les mots : retire les accents, passe en minuscules et supprime les espaces aux extrémités.
const norm=s=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
// Construit un ensemble sans doublons contenant la famille et les mots-clés de la polarité choisie.
function terms(x,p){return new Set([x[p].famille,...x[p].mots_cles].map(norm));}
// Moteur de tirage : choisit d’abord une tradition uniformément, puis un symbole de cette tradition. Les traditions ne sont donc pas pondérées par leur taille.
function makeDraw(data,mode){const groups=[...new Set(data.map(x=>x.tradition))];const pool=g=>data.filter(x=>x.tradition===g);const first=pick(pool(pick(groups)));const pol=pick(['positive','negative']);const item=(x,p,role='',common=[])=>({x,p,role,common});/* Mode simple : un symbole et une polarité. */ if(mode==='simple')return [item(first,pol)];/* Mode croisé : trois traditions distinctes ; obstacle négatif et voie positive. */ if(mode==='croise'){const available=groups.filter(g=>g!==first.tradition);const second=pick(available);const third=pick(available.filter(g=>g!==second));return [item(first,pol,'D’où tu viens'),item(pick(pool(second)),'negative','Le présent'),item(pick(pool(third)),'positive','Où tu vas')];}throw new Error('Mode de consultation inconnu.');}
// Expose le moteur pour les tests Node.js, sans avoir besoin du navigateur.
if(typeof module!=='undefined')module.exports={makeDraw,terms};
// Le bloc suivant ne s’exécute que si le DOM du navigateur existe.
if(typeof document!=='undefined'){
// État de l’application : symboles chargés, tirage courant et favoris. La clé localStorage reste stable entre les versions.
let data=[],current=[],favorites=[];
// Références générales, indexées par tradition pour les tirages et les favoris.
const referencesParTradition=new Map();const key='oracle-universel-v1-favoris';
// Relit les favoris sauvegardés sur cet appareil ; ignore les entrées sans tableau de tirage.
try{const raw=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(raw))favorites=raw.filter(f=>f&&Array.isArray(f.draw));}catch(e){$('status').textContent='Favoris locaux indisponibles.';}
// Crée un élément HTML avec du texte (textContent évite d’interpréter ce texte comme du HTML).
function el(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;}
// Ajoute une ligne documentaire uniquement lorsque la donnée existe.
// Les liens HTTP(S) sont cliquables ; les autres références restent du texte.
function ligneReference(parent, label, valeur){
 const valeurs=(Array.isArray(valeur)?valeur:[valeur]).filter(v=>typeof v==='string'&&v.trim());
 if(!valeurs.length)return;
 const ligne=document.createElement('p');
 ligne.append(el('strong',label+' : '));
 valeurs.forEach((v,i)=>{
  if(i)ligne.append(document.createTextNode(' ; '));
  if(/^https?:\/\//i.test(v)){
   const lien=el('a',v);lien.href=v;lien.target='_blank';lien.rel='noopener noreferrer';ligne.append(lien);
  }else ligne.append(document.createTextNode(v));
 });
 parent.append(ligne);
}
// Affiche les informations du symbole et les références générales sans inventer de source.
function detailsReferences(d){
 const x=d.x, p=x[d.p]||{};
 const bloc=document.createElement('details');bloc.className='sources-oracle';
 bloc.append(el('summary','Sources et références'));
 ligneReference(bloc,'Tradition',x.tradition);
 ligneReference(bloc,'Symbole',x.titre);
 ligneReference(bloc,'Rôle dans le tirage',d.role);
 ligneReference(bloc,'Polarité',d.p==='positive'?'Positive':'Négative');
 ligneReference(bloc,'Thème',x.theme);
 ligneReference(bloc,'Famille',p.famille);
 ligneReference(bloc,'Mots-clés',p.mots_cles);
 ligneReference(bloc,'Correspondances',d.common);
 ligneReference(bloc,'Personnage',x.personnage);
 ligneReference(bloc,'Univers',x.univers);
 ligneReference(bloc,'Contexte',x.contexte);
 ligneReference(bloc,'Source du symbole',x.source);
 ligneReference(bloc,'Référence précise',x.reference);
 ligneReference(bloc,'Sources documentaires',x.sources);
 ligneReference(bloc,'Nature de l’interprétation',x.nature_interpretation||(x.type==='enseignement_reformule'?'Enseignement reformulé, non citation authentique':x.type==='extrait_ou_reformulation_editoriale'?'Extrait ou reformulation éditoriale':null));
 ligneReference(bloc,'Vérification',x.verification);
 ligneReference(bloc,'Droits',x.droits);
 const refs=referencesParTradition.get(x.tradition)||[];
 for(const r of refs){ligneReference(bloc,'Précision',r.extension);ligneReference(bloc,'Droits du référentiel',r.droits);}
 return bloc;
}
// Construit le message affiché pour un symbole tiré.
function card(d){
 const a=document.createElement('article');a.className='oracle-message';
 // Privilégie l’enseignement lorsqu’il existe, sinon affiche la description de la polarité.
 const phrase=d.x.enseignement||d.x[d.p].description;
 // Affiche un titre uniquement pour les trois étapes du tirage croisé.
 const titresCroises=['D’où tu viens','Le présent','Où tu vas'];
 if(titresCroises.includes(d.role))a.append(el('h2',d.role));
 a.append(el('p',phrase,'phrase-cle'));
 // Ajoute le conseil spécifique à League of Legends lorsqu’il est disponible.
 if(d.x.univers==='League of Legends'&&d.x.conseil)a.append(el('p','Conseil : '+d.x.conseil,'conseil-lol'));
 a.append(detailsReferences(d));
 return a;
}
// Enregistre les favoris sous forme de JSON dans localStorage. Ne modifie l’état en mémoire que si la sauvegarde réussit.
function persist(next){try{localStorage.setItem(key,JSON.stringify(next));favorites=next;return true;}catch(e){$('status').textContent='Sauvegarde impossible : stockage indisponible.';return false;}}
// Reconstruit la liste des favoris avec leur date, leurs messages et un bouton de suppression.
function renderSaved(){$('saved').replaceChildren();if(!favorites.length)$('saved').append(el('p','Aucun tirage enregistré.'));favorites.forEach((f,i)=>{const wrap=document.createElement('section');wrap.append(el('h2',new Date(f.date).toLocaleString('fr-FR')),...f.draw.map(card));const b=el('button','Supprimer ce tirage');b.onclick=()=>{if(persist(favorites.filter((_,j)=>j!==i)))renderSaved();};wrap.append(b);$('saved').append(wrap);});}
// Textes explicatifs associés aux trois modes de consultation.
// Invitation fixe à la méditation, affichée avant les résultats du tirage croisé.
const texteMeditation="Prends le temps de la réflexion et de la méditation. Ne cherche pas une réponse immédiate, mais laisse ces trois messages résonner en toi. Leur sens se révèle dans les liens que tu établis avec ton propre chemin de vie. Ils ne prédisent pas ton avenir, mais t'invitent à mieux comprendre celui que tu construis.";
const intros={simple:'Un symbole et une polarité au hasard.',croise:'Trois traditions : d’où tu viens, le présent et où tu vas.'};
// Efface le tirage précédent et masque le bouton de sauvegarde lors du changement de mode.
function reset(){$('intro').textContent=intros[$('mode').value];$('results').replaceChildren();current=[];$('save').hidden=true;}
// Événements de consultation : changement de mode, lancement du tirage, affichage des résultats et gestion des erreurs.
$('mode').onchange=reset;reset();$('draw').onclick=()=>{try{current=makeDraw(data,$('mode').value);$('results').replaceChildren(...current.map(card));if($('mode').value==='croise')$('results').prepend(el('p',texteMeditation,'meta'));$('save').hidden=false;$('save').disabled=false;$('status').textContent='';}catch(e){$('status').textContent='Erreur de tirage : '+e.message;console.error(e);}};
// Ajoute le tirage courant aux favoris avec sa date et désactive le bouton pour éviter un double enregistrement.
$('save').onclick=()=>{if(current.length&&persist([{date:Date.now(),draw:current},...favorites])){$('save').disabled=true;$('status').textContent='Tirage enregistré.';}};
// Navigation entre consultation, favoris et informations ; aria-current indique la page active aux technologies d’assistance.
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button').forEach(n=>n.removeAttribute('aria-current'));b.setAttribute('aria-current','page');['consultation','favorites','info'].forEach(id=>$(id).hidden=id!==b.dataset.page);if(b.dataset.page==='favorites')renderSaved();});
// Charge la base modulaire au démarrage. Le bouton de tirage reste désactivé jusqu’à la validation des données.
async function loadData(){
 try {
  $('draw').disabled=true;
  // Lit un fichier du dossier data avec fetch ; une erreur HTTP interrompt le chargement.
  async function lireJSON(fichier){
   const r=await fetch('./data/'+fichier,{cache:'no-store'});
   if(!r.ok)throw Error(fichier+' : HTTP '+r.status);
   return r.json();
  }
  // Le catalogue index.json indique quels référentiels charger.
  const index=await lireJSON('index.json');
  // Promise.all charge les référentiels en parallèle et attend leur disponibilité.
  const fichiers=await Promise.all(index.referentiels.map(ref=>lireJSON(ref.fichier)));
  // Fusionne les tableaux symboles dans un seul tableau en mémoire ; vérifie que chaque fichier en possède un.
  const symboles=fichiers.flatMap((f,i)=>{if(!Array.isArray(f.symboles))throw Error(index.referentiels[i].fichier+' : tableau symboles manquant');return f.symboles;});
  // Vérifie les champs indispensables au moteur et les deux polarités.
  if(!symboles.length||symboles.some(x=>!x.id||!x.tradition||!['positive','negative'].every(p=>x[p]&&typeof x[p].description==='string'&&typeof x[p].famille==='string'&&Array.isArray(x[p].mots_cles))))throw Error('Structure des symboles invalide');
  // Refuse les identifiants dupliqués.
  if(new Set(symboles.map(x=>x.id)).size!==symboles.length)throw Error('Identifiants en double');
  // Compte les traditions distinctes ; trois sont nécessaires pour le tirage croisé.
  const traditions=new Set(symboles.map(x=>x.tradition));
  if(traditions.size<3)throw Error('Trois traditions minimum requises');
  // Associe les références documentaires à chaque tradition, y compris pour les anciens favoris.
  referencesParTradition.clear();
  for(const f of fichiers){
   const refs=Array.isArray(f.references)?f.references:[];
   referencesParTradition.set(f.tradition,refs);
  }
  if(!$('favorites').hidden)renderSaved();
  // Publie les données validées, puis réactive la consultation.
  data=symboles;
  $('draw').disabled=false;
  $('status').textContent=data.length+' symboles disponibles — '+traditions.size+' traditions.';
  // Actualise le texte de présentation à partir des données réellement chargées.
  $('base-info').textContent=traditions.size+' traditions symboliques et '+data.length+' symboles. Les interprétations sont des pistes de réflexion, non des prédictions.';
 }catch(e){$('status').textContent='Chargement impossible : '+e.message+'. Ouvrez le dossier avec Live Server.';console.error(e);}
}
// Démarre le chargement de la base.
loadData();
// Recharge une fois la page lorsque le nouveau service worker remplace l’ancien.
if('serviceWorker' in navigator && navigator.serviceWorker.controller){
 let rechargement=false;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!rechargement){rechargement=true;location.reload();}});
}
// Enregistre le service worker sur HTTPS ou localhost pour préparer le fonctionnement hors connexion.
if('serviceWorker'in navigator&&window.isSecureContext){navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(()=>navigator.serviceWorker.ready).then(()=>{$('offline').textContent='Cache hors connexion préparé.';}).catch(()=>{$('offline').textContent='Mode hors connexion indisponible.';});}else $('offline').textContent='HTTPS ou localhost requis pour le mode hors connexion.';
}
