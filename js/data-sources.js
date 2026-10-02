/* PRO KAYAK FISHING — verified data-source declaration
   Client-side secrets are intentionally not stored in this file. */
const DATA_SOURCES={
  weather:{
    primary:"ECMWF IFS HRES via Open-Meteo",
    endpoint:"api.open-meteo.com/v1/forecast",
    model:"ecmwf_ifs025",
    status:"active"
  },
  waves:{
    primary:"Open-Meteo Marine model",
    endpoint:"marine-api.open-meteo.com/v1/marine",
    status:"active"
  },
  ocean:{
    primary:"Open-Meteo Marine ocean-current model",
    endpoint:"marine-api.open-meteo.com/v1/marine",
    status:"active"
  },
  tides:{
    primary:"Open-Meteo modelled sea-level height including tides",
    endpoint:"marine-api.open-meteo.com/v1/marine",
    status:"modelled-not-dedicated-tide-provider",
    note:"Coastal accuracy is limited; not a navigation-grade tide source."
  }
};

function getDataSourceStatus(){return DATA_SOURCES}
