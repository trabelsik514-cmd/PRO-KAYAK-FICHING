/* PRO KAYAK FISHING — professional data-source layer
   Primary targets: ECMWF + Copernicus Marine + dedicated tide provider.
   Secrets must NEVER be placed in client-side JS. */
const DATA_SOURCES={
 weather:{primary:"ECMWF IFS/AIFS",fallback:"Open-Meteo",status:"fallback-active"},
 waves:{primary:"Copernicus Marine Global Waves",fallback:"Open-Meteo Marine",status:"fallback-active"},
 ocean:{primary:"Copernicus Marine Global Ocean Physics",fallback:"Open-Meteo Marine",status:"fallback-active"},
 tides:{primary:"Dedicated tide service",fallback:"none",status:"requires-server-key"}
};
function getDataSourceStatus(){return DATA_SOURCES}
