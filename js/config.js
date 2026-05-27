// config.js

const PAISES = [
  { country: 'Perú',      currency: 'PEN', symbol: 'S/',  monedaNombre: 'Sol peruano'         },
  { country: 'EE.UU.',    currency: 'USD', symbol: '$',   monedaNombre: 'Dólar estadounidense' },
  { country: 'España',    currency: 'EUR', symbol: '€',   monedaNombre: 'Euro'                 },
  { country: 'México',    currency: 'MXN', symbol: '$',   monedaNombre: 'Peso mexicano'        },
  { country: 'Colombia',  currency: 'COP', symbol: '$',   monedaNombre: 'Peso colombiano'      },
  { country: 'Brasil',    currency: 'BRL', symbol: 'R$',  monedaNombre: 'Real brasileño'       },
  { country: 'Chile',     currency: 'CLP', symbol: '$',   monedaNombre: 'Peso chileno'         },
  { country: 'Argentina', currency: 'ARS', symbol: '$',   monedaNombre: 'Peso argentino'       }
];

/**
 * Devuelve el símbolo de moneda del usuario activo.
 * @returns {string}
 */
function getCurrencySymbol() {
  const user = Storage.getUser();
  return user?.symbol ?? 'S/';
}