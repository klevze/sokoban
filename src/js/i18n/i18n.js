/**
 * Internationalization manager for Sokoban
 * Handles language switching and text retrieval
 */

import en from './langs/en.js';
import de from './langs/de.js';
import fr from './langs/fr.js';
import es from './langs/es.js';
import sl from './langs/sl.js';
import hr from './langs/hr.js';
import hu from './langs/hu.js';
import cs from './langs/cs.js';
import sk from './langs/sk.js';
import sr from './langs/sr.js';
import zh from './langs/zh.js';
import ja from './langs/ja.js';

// Flag emoji Unicode points for each language
const FLAG_EMOJIS = {
  en: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 30'><clipPath id='s'><path d='M0,0 v30 h60 v-30 z'/></clipPath><clipPath id='t'><path d='M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z'/></clipPath><g clip-path='url(%23s)'><path d='M0,0 v30 h60 v-30 z' fill='%23012169'/><path d='M0,0 L60,30 M60,0 L0,30' stroke='%23fff' stroke-width='6'/><path d='M0,0 L60,30 M60,0 L0,30' clip-path='url(%23t)' stroke='%23C8102E' stroke-width='4'/><path d='M30,0 v30 M0,15 h60' stroke='%23fff' stroke-width='10'/><path d='M30,0 v30 M0,15 h60' stroke='%23C8102E' stroke-width='6'/></g></svg>",
  de: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1000' height='600' viewBox='0 0 5 3'><rect width='5' height='3' y='0' x='0' fill='%23000'/><rect width='5' height='2' y='1' x='0' fill='%23D00'/><rect width='5' height='1' y='2' x='0' fill='%23FFCE00'/></svg>",
  fr: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='900' height='600'><rect width='900' height='600' fill='%23ED2939'/><rect width='600' height='600' fill='%23fff'/><rect width='300' height='600' fill='%23002395'/></svg>",
  es: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='750' height='500'><rect width='750' height='500' fill='%23c60b1e'/><rect width='750' height='250' fill='%23ffc400'/></svg>",
  sl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='600'><rect width='1200' height='600' fill='%23fff'/><rect width='1200' height='400' y='200' fill='%23005CE6'/><rect width='1200' height='200' y='400' fill='%23ED1C24'/></svg>",
  hr: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='600'><rect width='1200' height='200' fill='%23FF0000'/><rect width='1200' height='200' y='200' fill='%23FFFFFF'/><rect width='1200' height='200' y='400' fill='%230093DD'/></svg>",
  hu: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='600'><rect width='1200' height='200' fill='%23ce2939'/><rect width='1200' height='200' y='200' fill='%23fff'/><rect width='1200' height='200' y='400' fill='%23398017'/></svg>",
  cs: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'><path fill='%23d7141a' d='M0 0h600v200H0z'/><path fill='%23fff' d='M0 200h600v200H0z'/><path fill='%2311457e' d='M300 200L0 0v400z'/></svg>",
  sk: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 600'><path fill='%23ee1c25' d='M0 0h900v200H0z'/><path fill='%230b4ea2' d='M0 200h900v200H0z'/><path fill='%23fff' d='M0 400h900v200H0z'/></svg>",
  sr: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1350' height='900'><rect width='1350' height='300' fill='%23c6363c'/><rect width='1350' height='300' y='300' fill='%230c4076'/><rect width='1350' height='300' y='600' fill='%23fff'/></svg>",
  zh: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 600'><rect fill='%23de2910' x='0' y='0' width='900' height='600'/><g fill='%23ffde00'><path d='M213,60l-15,47h-49l39,28l-15,47l40-29l40,29l-15-47l39-28h-49'/><path d='M330,130l-15,47h-49l39,28l-15,47l40-29l40,29l-15-47l39-28h-49'/><path d='M390,210l-15,47h-49l39,28l-15,47l40-29l40,29l-15-47l39-28h-49'/><path d='M330,290l-15,47h-49l39,28l-15,47l40-29l40,29l-15-47l39-28h-49'/><path d='M213,369l-15,47h-49l39,28l-15,47l40-29l40,29l-15-47l39-28h-49'/></g></svg>",
  ja: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 600'><rect fill='%23fff' x='0' y='0' width='900' height='600'/><circle fill='%23bc002d' cx='450' cy='300' r='180'/></svg>"
};

export class I18n {
  /**
   * Initialize the i18n system
   */
  constructor() {
    // Available languages with names and flag icons
    this.languages = {
      en: { name: "English", data: en, flag: FLAG_EMOJIS.en },
      de: { name: "Deutsch", data: de, flag: FLAG_EMOJIS.de },
      fr: { name: "Français", data: fr, flag: FLAG_EMOJIS.fr },
      es: { name: "Español", data: es, flag: FLAG_EMOJIS.es },
      sl: { name: "Slovenščina", data: sl, flag: FLAG_EMOJIS.sl },
      hr: { name: "Hrvatski", data: hr, flag: FLAG_EMOJIS.hr },
      hu: { name: "Magyar", data: hu, flag: FLAG_EMOJIS.hu },
      cs: { name: "Čeština", data: cs, flag: FLAG_EMOJIS.cs },
      sk: { name: "Slovenčina", data: sk, flag: FLAG_EMOJIS.sk },
      sr: { name: "Српски", data: sr, flag: FLAG_EMOJIS.sr },
      zh: { name: "中文", data: zh, flag: FLAG_EMOJIS.zh },
      ja: { name: "日本語", data: ja, flag: FLAG_EMOJIS.ja }
    };
    
    // Default language - load from localStorage or use English
    this.currentLang = localStorage.getItem('sokoban_language') || 'en';
    
    // Event handler for language change
    this.onLanguageChange = null;
  }
  
  /**
   * Get list of available languages
   * @returns {Object} Object with language codes as keys and language info as values
   */
  getLanguages() {
    const result = {};
    for (const code in this.languages) {
      result[code] = {
        name: this.languages[code].name,
        flag: this.languages[code].flag
      };
    }
    return result;
  }
  
  /**
   * Change current language
   * @param {string} langCode - Language code to switch to
   * @returns {boolean} Success of language change
   */
  setLanguage(langCode) {
    if (this.languages[langCode]) {
      this.currentLang = langCode;
      localStorage.setItem('sokoban_language', langCode);
      
      // Update document title
      document.title = this.get('title');
      
      // Call event handler if defined
      if (typeof this.onLanguageChange === 'function') {
        this.onLanguageChange(langCode);
      }
      
      return true;
    }
    return false;
  }
  
  /**
   * Get translation for a key
   * @param {string} key - Translation key, can be nested with dots (e.g. 'menu.newGame')
   * @returns {string} Translated string or key itself if not found
   */
  get(key) {
    const langData = this.languages[this.currentLang]?.data;
    if (!langData) return key;
    
    const keys = key.split('.');
    
    let result = langData;
    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return result;
  }
  
  /**
   * Get current language code
   * @returns {string} Current language code
   */
  getCurrentLanguage() {
    return this.currentLang;
  }
}