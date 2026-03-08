const { i18n } = require("next-i18next");

/** @type {import('next-i18next').UserConfig} */
const config = {
  i18n: {
    defaultLocale: "pt-PT",
    locales: ["pt-PT", "pt-BR", "en-US", "es-ES", "fr-FR", "de-DE", "it-IT"],
  },
  defaultNS: "common",
  localePath: "./locales",
};

module.exports = config;
