// Nom du cache de cette version. À changer lors d’une publication modifiant les ressources pour renouveler le cache.
const CACHE='oracle-universel-v1.17-invitation';
// Ressources indispensables à l’interface, au manifeste PWA et au catalogue JSON.
const FILES=['./','./index.html','./style.css','./app.js','./manifest.json','./data/index.json','./icons/icon-192.png','./icons/icon-512.png'];
// Installation : attend la mise en cache des ressources avant de rendre le service worker disponible.
self.addEventListener('install',event=>event.waitUntil((async()=>{
 // Ouvre le cache dédié à cette version.
 const cache=await caches.open(CACHE);
 // Télécharge les ressources de base en demandant une actualisation du cache HTTP.
 await cache.addAll(FILES.map(path=>new Request(path,{cache:"reload"})));
 // Lit le catalogue déjà mis en cache.
 const index=await (await cache.match('./data/index.json')).json();
 // Construit automatiquement les chemins des référentiels déclarés.
 const paths=index.referentiels.map(r=>'./data/'+r.fichier);
 // Met en cache les référentiels, les citations et les compléments.
 await cache.addAll([...paths,'./data/'+index.citations,'./data/'+index.complements].map(path=>new Request(path,{cache:'reload'})));
 // Ensemble des chemins d’images, sans doublons.
 const images=new Set();
 // Parcourt les symboles pour retrouver les illustrations déclarées.
 for(const path of paths){const f=await (await cache.match(path)).json();for(const s of f.symboles)if(s.image?.fichier)images.add('./'+s.image.fichier);}
 // Tente de sauvegarder les images sans bloquer l’installation si certaines sont absentes.
 await Promise.allSettled([...images].map(path=>cache.add(path)));
 // Demande l’activation immédiate du nouveau service worker.
 await self.skipWaiting();
})()));
// Activation : supprime les anciens caches de l’oracle et prend le contrôle des pages ouvertes.
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('oracle-universel-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
// Priorité au réseau pour les données et le code : les modifications sont visibles au rechargement.
// Le cache reste disponible lorsque le réseau est inaccessible.
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||!req.url.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const path=new URL(req.url).pathname;
  const actualiser=req.mode==='navigate'||/\.(json|js|css|html)$/.test(path);
  if(!actualiser){const saved=await cache.match(req);if(saved)return saved;}
  try{
   const r=await fetch(req,{cache:'no-store'});
   if(r.ok){await cache.put(req,r.clone());return r;}
   if(r.status<500)return r;
  }catch(e){/* Hors connexion : utiliser la dernière version disponible. */}
  return (await cache.match(req))||(req.mode==='navigate'&&await cache.match('./index.html'))||Response.error();
 })());
});
