# PRO KAYAK FISHING

الخطوة الأولى: صفحة رئيسية مخصصة لحالة الطقس والبحر للصيد بالكاياك.

- طقس حقيقي من Open-Meteo.
- بيانات الموج من Open-Meteo Marine.
- GPS واختيار الموقع بالضغط على الخريطة.
- الشروق والغروب.
- قسم المد والجزر موجود في الواجهة، ولن تُعرض فيه أرقام وهمية قبل ربط مصدر حقيقي.
- index.html خفيف، والستايل والبرمجة منفصلان.
\n\n## Data architecture\n- Target weather source: ECMWF IFS/AIFS.\n- Target marine physics and currents: Copernicus Marine.\n- Target waves: Copernicus Marine Global Waves.\n- Tide provider: dedicated tide API through a server-side proxy; API keys must not be exposed in the browser.\n- Open-Meteo remains the current fallback until authenticated server-side access is configured.\n