const listings = [
  {server:"Ephesus",cat:"Yang",title:"500M Yang",desc:"Hızlı teslim • Güvenilir satıcı",price:"1.250 TL"},
  {server:"Ephesus",cat:"Eşya",title:"Mutluluk +9",desc:"Temiz item • Görsel mevcut",price:"850 TL"},
  {server:"Teos",cat:"Karakter",title:"75 Lv Sura",desc:"Gelişime açık karakter",price:"3.500 TL"},
  {server:"Pergamon",cat:"Eşya",title:"Şeytani Pala +9",desc:"Farm için uygun",price:"900 TL"},
  {server:"Teos",cat:"Yang",title:"250M Yang",desc:"Anında teslim",price:"650 TL"},
  {server:"Pergamon",cat:"Hesap",title:"Başlangıç Hesabı",desc:"Detaylar ilan içerisinde",price:"1.750 TL"}
];

let selectedServer = "Tümü";
const grid = document.getElementById("listings");
const category = document.getElementById("category");

function render(){
  const cat = category.value;
  const data = listings.filter(x => (selectedServer==="Tümü" || x.server===selectedServer) && (cat==="Tümü" || x.cat===cat));
  grid.innerHTML = data.map(x => `
    <article class="listing">
      <div class="listing-top"><span class="server-tag">${x.server.toUpperCase()}</span><span class="cat">${x.cat}</span></div>
      <h3>${x.title}</h3><p>${x.desc}</p>
      <div class="listing-bottom"><div class="price">${x.price} <small>TL</small></div><a class="view" href="#login">İLANI GÖR →</a></div>
    </article>`).join("") || `<div class="listing"><h3>İlan bulunamadı</h3><p>Filtreleri değiştirerek tekrar deneyebilirsin.</p></div>`;
}
document.querySelectorAll(".filter").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active"); selectedServer=btn.dataset.server; render();
  });
});
category.addEventListener("change", render);
document.querySelectorAll("[data-server-card]").forEach(card=>{
  card.addEventListener("click",()=>{
    selectedServer=card.dataset.serverCard;
    document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b.dataset.server===selectedServer));
    document.getElementById("market").scrollIntoView({behavior:"smooth"}); render();
  });
});
render();
