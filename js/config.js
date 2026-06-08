// config.js

const COUNTRIES = [
  { country: 'Perú',      currency: 'PEN', symbol: 'S/',  currencyName: 'Sol peruano'         },
  { country: 'EE.UU.',    currency: 'USD', symbol: '$',   currencyName: 'Dólar estadounidense' },
  { country: 'España',    currency: 'EUR', symbol: '€',   currencyName: 'Euro'                 },
  { country: 'México',    currency: 'MXN', symbol: '$',   currencyName: 'Peso mexicano'        },
  { country: 'Colombia',  currency: 'COP', symbol: '$',   currencyName: 'Peso colombiano'      },
  { country: 'Brasil',    currency: 'BRL', symbol: 'R$',  currencyName: 'Real brasileño'       },
  { country: 'Chile',     currency: 'CLP', symbol: '$',   currencyName: 'Peso chileno'         },
  { country: 'Argentina', currency: 'ARS', symbol: '$',   currencyName: 'Peso argentino'       }
];

/**
 * Returns the currency symbol of the active user.
 * @returns {string}
 */
function getCurrencySymbol() {
  const user = Storage.getUser();
  return user?.symbol ?? 'S/';
}