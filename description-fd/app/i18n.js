export default {
  // This is the list of languages your application supports
  supportedLngs: ["en", "zh-CN"],
  // This is the language you want to use in case
  // if the user language is not in the supportedLngs
  interpolation: {
    escapeValue: false,
  },

  fallbackLng: "en",
  // The default namespace of i18next is "translation", but you can customize it here
  // defaultNS: "common",
};

// import fs from 'fs';
// import path from 'path';
// import translate from 'google-translate-api';

// const sourceLang = 'en';
// const targetLangs = ["fr", "de", "es", "it", "nl", "pt", "sv", "ja", "ko", "ru" , "tr" , "uk" , "zh-CN", "zh-TW"];

// const inputPath = path.resolve(__dirname, '../locales/en/translation.json');
// const baseData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

// // 获取命令行参数中的 key，例如：npm run i18n:key hello
// const specificKey = process.argv[2]; // 第一个参数

// async function translateKey(key) {
//   const value = baseData[key];
//   if (!value) {
//     console.error(`❌ key "${key}" 不存在于英文翻译中`);
//     return;
//   }

//   for (const lang of targetLangs) {
//     try {
//       const res = await translate(value, { from: sourceLang, to: lang });
//       const outputPath = path.resolve(__dirname, `../locales/${lang}/translation.json`);
//       const langData = fs.existsSync(outputPath)
//         ? JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
//         : {};

//       langData[key] = res.text;
//       fs.writeFileSync(outputPath, JSON.stringify(langData, null, 2));
//       console.log(`✅ [${lang}] ${key}: ${value} => ${res.text}`);
//     } catch (err) {
//       console.error(`❌ 翻译失败: ${value}`, err);
//     }
//   }
// }

// if (specificKey) {
//   translateKey(specificKey);
// } else {
//   console.log('⚠️ 请输入一个要翻译的 key，例如：npm run i18n:key hello');
// }

