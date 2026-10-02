/* PRO KAYAK FISHING — dashboard controller
   Verified fixes:
   - Explicit ECMWF IFS weather model
   - Selected-date weather is actually taken from the selected date
   - Search location name is preserved
   - Weather icons use the exact SVG symbol returned by codeInfo()
   - Wind compass is isolated from text and never overlays the card
   - Tide/sea-level data is clearly treated as modelled sea-level data
   - Safe loading/error states and stable language switching
*/
const state={
  lat:35.8256,
  lon:10.63699,
  lang:"ar",
  date:new Date().toISOString().slice(0,10),
  placeName:""
};

const $=id=>document.getElementById(id);
const kn=v=>Number(v)*0.539957;
const today=()=>new Date().toISOString().slice(0,10);

function applyLang(){
  document.documentElement.lang=state.lang;
  document.documentElement.dir=state.lang==="ar"?"rtl":"ltr";

  document.querySelectorAll("[data-ar]").forEach(e=>{
    e.textContent=e.dataset[state.lang==="ar"?"ar":"fr"];
  });

  document.querySelectorAll("[data-ar-placeholder]").forEach(e=>{
    e.placeholder=e.dataset[state.lang==="ar"?"arPlaceholder":"frPlaceholder"];
  });

  if($("langBtn")) $("langBtn").querySelector("span").textContent=state.lang==="ar"?"FR":"AR";
  if($("datePicker")) $("datePicker").value=state.date;

  updatePlaceLabel();
}

function fmt(v){
  if(!v) return "--:--";
  return new Date(v).toLocaleTimeString(
    state.lang==="ar"?"ar-TN":"fr-TN",
    {hour:"2-digit",minute:"2-digit",hour12:false}
  );
}

function codeInfo(c){
  const a={
    0:["صافي","Clair","wx-sun","sun"],
    1:["غالبًا صافٍ","Plutôt clair","wx-sun","sun"],
    2:["غائم جزئيًا","Partiellement nuageux","wx-cloud-sun","cloud-sun"],
    3:["غائم","Nuageux","wx-cloud","cloud"],
    45:["ضباب","Brouillard","wx-cloud","cloud"],
    48:["ضباب","Brouillard","wx-cloud","cloud"],
    51:["رذاذ","Bruine","wx-rain","cloud-rain"],
    53:["رذاذ","Bruine","wx-rain","cloud-rain"],
    55:["رذاذ كثيف","Bruine forte","wx-rain","cloud-rain"],
    56:["رذاذ متجمد","Bruine verglaçante","wx-rain","cloud-rain"],
    57:["رذاذ متجمد كثيف","Bruine verglaçante forte","wx-rain","cloud-rain"],
    61:["مطر","Pluie","wx-rain","cloud-rain"],
    63:["مطر","Pluie","wx-rain","cloud-rain"],
    65:["مطر غزير","Forte pluie","wx-rain","cloud-rain"],
    66:["مطر متجمد","Pluie verglaçante","wx-rain","cloud-rain"],
    67:["مطر متجمد غزير","Forte pluie verglaçante","wx-rain","cloud-rain"],
    71:["ثلج","Neige","wx-cloud","cloud"],
    73:["ثلج","Neige","wx-cloud","cloud"],
    75:["ثلج غزير","Forte neige","wx-cloud","cloud"],
    77:["حبوب ثلج","Grésil","wx-cloud","cloud"],
    80:["زخات","Averses","wx-rain","cloud-rain"],
    81:["زخات قوية","Fortes averses","wx-rain","cloud-rain"],
    82:["زخات شديدة","Très fortes averses","wx-rain","cloud-rain"],
    85:["زخات ثلج","Averses de neige","wx-cloud","cloud"],
    86:["زخات ثلج قوية","Fortes averses de neige","wx-cloud","cloud"],
    95:["عاصفة رعدية","Orage","wx-rain","cloud-rain"],
    96:["عاصفة مع برد","Orage avec grêle","wx-rain","cloud-rain"],
    99:["عاصفة قوية مع برد","Orage fort avec grêle","wx-rain","cloud-rain"]
  };
  return a[c]||["حالة جوية","Météo","wx-cloud","cloud"];
}

function updatePlaceLabel(){
  const n=state.placeName || (state.lang==="ar"?"الموقع الحالي":"Position actuelle");
  if($("place")) $("place").textContent=n+" • "+state.lat.toFixed(3)+", "+state.lon.toFixed(3);
}

function setStatus(el,text){
  if(el) el.textContent=text;
}

function weatherScore(w,m){
  let s=100;
  const ws=kn(w.wind_speed_10m);
  const wg=kn(w.wind_gusts_10m);
  const wh=Number(m?.wave_height||0);

  if(ws>18)s-=25; else if(ws>12)s-=12;
  if(wg>25)s-=15; else if(wg>18)s-=8;
  if(wh>1.5)s-=25; else if(wh>1)s-=12;
  if([61,63,65,80,81,82,95,96,99].includes(w.weather_code))s-=12;

  return Math.max(0,Math.min(100,Math.round(s)));
}

function check(v){
  return v>=75
    ?(state.lang==="ar"?"جيد":"Bon")
    :v>=55
      ?(state.lang==="ar"?"متوسط":"Moyen")
      :(state.lang==="ar"?"ضعيف":"Faible");
}

function moonData(dateStr){
  const d=new Date(dateStr+"T12:00:00Z");
  const known=new Date("2000-01-06T18:14:00Z");
  const syn=29.530588853;
  let age=((d-known)/86400000)%syn;
  if(age<0)age+=syn;

  const illum=(1-Math.cos(2*Math.PI*age/syn))/2;
  const names=state.lang==="ar"
    ?["محاق","هلال متزايد","تربيع أول","أحدب متزايد","بدر","أحدب متناقص","تربيع أخير","هلال متناقص"]
    :["Nouvelle lune","Croissant","Premier quartier","Gibbeuse croissante","Pleine lune","Gibbeuse décroissante","Dernier quartier","Dernier croissant"];
  const idx=Math.round(age/syn*8)%8;

  return {
    age,
    illum:Math.round(illum*100),
    name:names[idx],
    symbol:["●","◔","◑","◕","○","◕","◑","◔"][idx]
  };
}

function drawChart(sunrise,sunset,mData,tideData){
  const svg=$("skyChart");
  if(!svg)return;

  const W=900,H=300,p=42;
  let grid="";

  for(let h=0;h<=24;h+=3){
    const x=p+(W-2*p)*h/24;
    grid+=`<line class="chart-grid" x1="${x}" y1="24" x2="${x}" y2="255"/><text class="chart-label" x="${x}" y="280" text-anchor="middle">${String(h).padStart(2,"0")}:00</text>`;
  }

  const sr=new Date(sunrise);
  const ss=new Date(sunset);
  const srh=sr.getHours()+sr.getMinutes()/60;
  const ssh=ss.getHours()+ss.getMinutes()/60;
  const sunFn=h=>Math.max(0,Math.sin(Math.PI*(h-srh)/(ssh-srh)));
  const moonFn=h=>.48+.23*Math.sin(2*Math.PI*(h-(mData.age/2))/24);

  const tide=tideData?.heights||[];
  const ttimes=tideData?.times||[];
  const vals=tide.filter(Number.isFinite);
  const min=vals.length?Math.min(...vals):0;
  const max=vals.length?Math.max(...vals):1;
  const span=Math.max(.2,max-min);
  const tideY=v=>210-((v-min)/span)*125;

  let tidePath="";
  ttimes.forEach((ts,i)=>{
    const d=new Date(ts);
    const h=d.getHours()+d.getMinutes()/60;
    if(h<0||h>24||!Number.isFinite(tide[i]))return;
    const x=p+(W-2*p)*h/24;
    const y=tideY(tide[i]);
    tidePath+=(tidePath?"L":"M")+x.toFixed(1)+" "+y.toFixed(1);
  });

  let extrema="";
  for(let i=1;i<tide.length-1;i++){
    if(!Number.isFinite(tide[i]))continue;
    const d=new Date(ttimes[i]);
    const h=d.getHours()+d.getMinutes()/60;
    if(h<0||h>24)continue;

    const high=tide[i]>tide[i-1]&&tide[i]>=tide[i+1];
    const low=tide[i]<tide[i-1]&&tide[i]<=tide[i+1];

    if(high||low){
      const x=p+(W-2*p)*h/24;
      const y=tideY(tide[i]);
      extrema+=`<circle cx="${x}" cy="${y}" r="5" fill="#12a7f0"/><text class="chart-label" x="${x}" y="${y-9}" text-anchor="middle">${Number(tide[i]).toFixed(1)} m</text>`;
    }
  }

  const path=fn=>{
    let d="";
    for(let i=0;i<=96;i++){
      const h=i/4;
      const x=p+(W-2*p)*h/24;
      const y=240-fn(h)*160;
      d+=(i?"L":"M")+x.toFixed(1)+" "+y.toFixed(1);
    }
    return d;
  };

  svg.innerHTML=
    grid+
    `<path class="tide-line" d="${tidePath||"M42 210L858 210"} opacity=".9"/>`+
    extrema+
    `<path class="sun-line" d="${path(sunFn)}"/><path class="moon-line" d="${path(moonFn)}"/>`+
    `<circle cx="${p+(W-2*p)*srh/24}" cy="${240-sunFn(srh)*160}" r="7" fill="#ffb51e"/>`+
    `<circle cx="${p+(W-2*p)*ssh/24}" cy="240" r="7" fill="#ff7d38"/>`+
    `<text class="chart-label" x="${p}" y="45">${state.lang==="ar"?"المد والجزر":"Marées"}</text>`;
}

function renderHourly(h){
  const box=$("hourly");
  if(!box||!h?.time?.length)return;

  box.innerHTML="";
  for(let i=0;i<8;i++){
    const idx=Math.min(i*2,h.time.length-1);
    const ci=codeInfo(Number(h.weather_code[idx]));
    const icon=ci[3]||"cloud";

    const el=document.createElement("div");
    el.className="hour";
    el.innerHTML=
      `<b>${fmt(h.time[idx])}</b>`+
      `<svg class="hour-weather-svg" aria-label="${state.lang==="ar"?ci[0]:ci[1]}"><use href="assets/icons/pro-icons.svg#${icon}"></use></svg>`+
      `<span>${Math.round(h.temperature_2m[idx])}°C</span>`+
      `<span>${Math.round(kn(h.wind_speed_10m[idx]))} nd</span>`;
    box.appendChild(el);
  }
}

function selectedHourlyIndex(h){
  if(!h?.time?.length)return 0;
  const target=new Date(state.date+"T"+(state.date===today()?new Date().toTimeString().slice(0,5):"12:00"));
  let best=0,bestDiff=Infinity;

  h.time.forEach((t,i)=>{
    const diff=Math.abs(new Date(t)-target);
    if(diff<bestDiff){best=i;bestDiff=diff;}
  });

  return best;
}

function renderWeatherFromHour(w){
  const idx=selectedHourlyIndex(w.hourly);
  const code=Number(w.hourly.weather_code[idx]);
  const c=codeInfo(code);

  const temp=Number(w.hourly.temperature_2m[idx]);
  const wind=Number(w.hourly.wind_speed_10m[idx]);

  $("temp").textContent=Math.round(temp)+"°C";
  $("condition").textContent=state.lang==="ar"?c[0]:c[1];

  const icon=$("weatherIcon");
  icon.className="weather-icon";
  icon.innerHTML=`<svg class="weather-symbol" aria-label="${state.lang==="ar"?c[0]:c[1]}"><use href="assets/icons/pro-icons.svg#${c[3]}"></use></svg>`;

  if(state.date===today() && w.current){
    $("feels").textContent=(state.lang==="ar"?"الإحساس ":"Ressenti ")+Math.round(w.current.apparent_temperature)+"°C";
    $("humidity").textContent=Math.round(w.current.relative_humidity_2m)+"%";
    $("pressure").textContent=Math.round(w.current.pressure_msl)+" hPa";
    $("rain").textContent=Number(w.current.precipitation||0).toFixed(1)+" mm";
    $("wind").textContent=Math.round(kn(w.current.wind_speed_10m))+" nd";
    $("gust").textContent=(state.lang==="ar"?"هبات ":"Rafales ")+Math.round(kn(w.current.wind_gusts_10m))+" nd";
    const windDeg=Math.round(w.current.wind_direction_10m||0);
    $("winddir").textContent=windDeg+"°";
    $("windCompassDegree").textContent=windDeg+"°";
    $("windArrow").style.transform=`translate(-50%,-50%) rotate(${windDeg}deg)`;
  }else{
    $("feels").textContent=(state.lang==="ar"?"بيانات الساعة ":"Données horaires ")+fmt(w.hourly.time[idx]);
    $("humidity").textContent="--%";
    $("pressure").textContent="-- hPa";
    $("rain").textContent="-- mm";
  }

  if($("weatherTitle")){
    $("weatherTitle").textContent=state.date===today()
      ?(state.lang==="ar"?"الطقس الآن":"Météo maintenant")
      :(state.lang==="ar"?"طقس التاريخ المختار":"Météo de la date");
  }

  return {idx,code,c,wind,temp};
}

async function loadWeather(){
  const url=
    `https://api.open-meteo.com/v1/forecast?latitude=${state.lat}&longitude=${state.lon}`+
    `&models=ecmwf_ifs025`+
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code`+
    `&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,pressure_msl,precipitation,apparent_temperature,weather_code`+
    `&daily=sunrise,sunset&timezone=auto&start_date=${state.date}&end_date=${state.date}`;

  const w=await fetch(url).then(r=>{
    if(!r.ok)throw new Error("weather_http_"+r.status);
    return r.json();
  });

  if(w.error)throw new Error(w.reason||"weather_error");

  const selected=renderWeatherFromHour(w);
  $("sunrise").textContent=fmt(w.daily.sunrise[0]);
  $("sunset").textContent=fmt(w.daily.sunset[0]);

  const a=new Date(w.daily.sunrise[0]);
  const b=new Date(w.daily.sunset[0]);
  const mins=Math.max(0,Math.round((b-a)/60000));

  $("dayLength").textContent=
    (state.lang==="ar"?"مدة النهار ":"Durée du jour ")+
    Math.floor(mins/60)+" س "+(mins%60)+" د";

  renderHourly(w.hourly);
  return {...w,selected};
}

async function loadMarine(){
  try{
    const url=
      `https://marine-api.open-meteo.com/v1/marine?latitude=${state.lat}&longitude=${state.lon}`+
      `&current=wave_height,wave_direction,wave_period,sea_surface_temperature,ocean_current_velocity,ocean_current_direction,sea_level_height_msl`+
      `&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature,ocean_current_velocity,ocean_current_direction,sea_level_height_msl`+
      `&timezone=auto&start_date=${state.date}&end_date=${state.date}&cell_selection=sea`;

    const m=await fetch(url).then(r=>{
      if(!r.ok)throw new Error("marine_http_"+r.status);
      return r.json();
    });

    if(m.error||!m.current)throw new Error(m.reason||"marine_error");

    const wave=Number(m.current.wave_height);
    $("wave").textContent=Number.isFinite(wave)?wave.toFixed(1)+" m":"-- m";
    $("period").textContent=(state.lang==="ar"?"الفترة ":"Période ")+Number(m.current.wave_period||0).toFixed(1)+" s";
    $("wavedir").textContent=Math.round(m.current.wave_direction||0)+"°";
    $("waveArrow").style.transform=`rotate(${Number(m.current.wave_direction||0)}deg)`;

    $("sst").textContent=Number.isFinite(Number(m.current.sea_surface_temperature))
      ?Number(m.current.sea_surface_temperature).toFixed(1)+" °C":"-- °C";

    $("current").textContent=Number.isFinite(Number(m.current.ocean_current_velocity))
      ?Number(m.current.ocean_current_velocity).toFixed(1)+" km/h":"-- km/h";

    const sea=wave<0.7
      ?(state.lang==="ar"?"هادئ":"Calme")
      :wave<1.2
        ?(state.lang==="ar"?"متوسط":"Modérée")
        :(state.lang==="ar"?"مضطرب":"Agitée");

    $("seaState").textContent=sea;
    $("kayakStatus").textContent=wave<1.2
      ?(state.lang==="ar"?"✓ مناسب للكياك":"✓ Adapté au kayak")
      :(state.lang==="ar"?"⚠ حذر للكياك":"⚠ Prudence en kayak");

    const times=m.hourly?.time||[];
    const heights=(m.hourly?.sea_level_height_msl||[]).map(Number);
    const future=[];

    for(let i=1;i<heights.length-1;i++){
      if(!Number.isFinite(heights[i]))continue;
      const high=heights[i]>heights[i-1]&&heights[i]>=heights[i+1];
      const low=heights[i]<heights[i-1]&&heights[i]<=heights[i+1];
      if(high||low)future.push({time:times[i],height:heights[i],high});
    }

    const now=Date.now();
    const firstHigh=future.find(x=>new Date(x.time).getTime()>=now&&x.high);
    const firstLow=future.find(x=>new Date(x.time).getTime()>=now&&!x.high);

    $("nextHigh").textContent=firstHigh
      ?fmt(firstHigh.time)+" • "+firstHigh.height.toFixed(1)+" m"
      :"غير متوفر";

    $("nextLow").textContent=firstLow
      ?fmt(firstLow.time)+" • "+firstLow.height.toFixed(1)+" m"
      :"غير متوفر";

    return {
      current:m.current,
      hourly:m.hourly,
      tides:{times,heights},
      tideIsModelled:true
    };
  }catch(e){
    $("wave").textContent="-- m";
    $("period").textContent=state.lang==="ar"?"تعذر تحميل البحر":"Mer indisponible";
    $("nextHigh").textContent=state.lang==="ar"?"غير متوفر":"Indisponible";
    $("nextLow").textContent=state.lang==="ar"?"غير متوفر":"Indisponible";
    return null;
  }
}

async function load(){
  updatePlaceLabel();
  document.body.classList.add("loading-data");

  try{
    const [w,m]=await Promise.all([loadWeather(),loadMarine()]);
    const score=weatherScore(w.selected,m?.current);

    $("score").textContent=score;
    $("gaugeFill").style.strokeDashoffset=142-(142*score/100);
    $("windCheck").textContent=check(kn(w.selected.wind));
    $("waveCheck").textContent=m?.current?check(Math.max(0,100-Number(m.current.wave_height||0)*55)):"--";
    $("weatherCheck").textContent=[0,1].includes(w.selected.code)?check(90):check(70);

    // This is intentionally NOT presented as a dedicated tide-provider result.
    $("tideCheck").textContent=m?.tideIsModelled
      ?(state.lang==="ar"?"نموذجي":"Modélisé")
      :(state.lang==="ar"?"غير متوفر":"Indisponible");

    const md=moonData(state.date);
    $("moonVisual").className="moon-visual moon-phase-"+(Math.round(md.age/29.530588853*8)%8);
    $("moonVisual").innerHTML='<svg class="moon-symbol" aria-hidden="true"><use href="assets/icons/pro-icons.svg#moon"></use></svg>';
    $("moonPhase").textContent=md.name;
    $("moonIllum").textContent=md.illum+"%";

    drawChart(w.daily.sunrise[0],w.daily.sunset[0],md,m?.tides);

  }catch(e){
    setStatus($("condition"),state.lang==="ar"?"تعذر تحميل البيانات":"Données indisponibles");
    setStatus($("wave"),"-- m");
    console.error("PRO KAYAK load error",e);
  }finally{
    document.body.classList.remove("loading-data");
  }
}

function geo(){
  if(!navigator.geolocation){
    setStatus($("place"),state.lang==="ar"?"GPS غير متاح":"GPS indisponible");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    p=>{
      state.lat=p.coords.latitude;
      state.lon=p.coords.longitude;
      state.placeName=state.lang==="ar"?"موقعي":"Ma position";
      load();
    },
    ()=>{
      setStatus($("place"),state.lang==="ar"?"تعذر تحديد الموقع":"Position indisponible");
    },
    {enableHighAccuracy:true,timeout:12000,maximumAge:60000}
  );
}

async function searchArea(){
  const q=$("searchPlace").value.trim();
  const box=$("searchResults");
  if(!q)return;

  box.hidden=false;
  box.innerHTML='<div class="search-loading">'+(state.lang==="ar"?"جاري البحث...":"Recherche...")+"</div>";

  try{
    const r=await fetch(
      "https://geocoding-api.open-meteo.com/v1/search?name="+
      encodeURIComponent(q)+
      "&count=5&language="+
      (state.lang==="ar"?"ar":"fr")+
      "&format=json"
    ).then(x=>{
      if(!x.ok)throw new Error("search_http_"+x.status);
      return x.json();
    });

    const items=r.results||[];

    if(!items.length){
      box.innerHTML='<div class="search-loading">'+(state.lang==="ar"?"لم يتم العثور على المنطقة":"Zone introuvable")+"</div>";
      return;
    }

    box.innerHTML=items.map((x,i)=>
      '<button type="button" class="search-result" data-i="'+i+'">'+
      '<b>'+String(x.name||"")+'</b>'+
      '<span>'+[x.admin1,x.country].filter(Boolean).join(" • ")+"</span></button>"
    ).join("");

    box.querySelectorAll(".search-result").forEach((el,i)=>{
      el.onclick=()=>{
        const x=items[i];
        state.lat=Number(x.latitude);
        state.lon=Number(x.longitude);
        state.placeName=x.name||"";
        state.date=$("datePicker").value||today();

        $("searchPlace").value="";
        box.hidden=true;
        updatePlaceLabel();
        load();
      };
    });
  }catch(e){
    box.innerHTML='<div class="search-loading">'+
      (state.lang==="ar"?"تعذر الاتصال بخدمة البحث":"Service de recherche indisponible")+
      "</div>";
  }
}

function bind(){
  $("gps").onclick=geo;

  $("datePicker").onchange=e=>{
    if(!e.target.value)return;
    state.date=e.target.value;
    load();
  };

  $("langBtn").onclick=()=>{
    state.lang=state.lang==="ar"?"fr":"ar";
    applyLang();
    load();
  };

  $("searchBtn").onclick=searchArea;
  $("searchPlace").onkeydown=e=>{
    if(e.key==="Enter")searchArea();
  };

  const menu=$(".menu-btn");
  if(menu){
    menu.onclick=()=>{
      const target=$("searchPlace");
      if(target){
        target.focus();
        target.scrollIntoView({behavior:"smooth",block:"center"});
      }
    };
  }
}

$("datePicker").value=state.date;
bind();
applyLang();
load();
