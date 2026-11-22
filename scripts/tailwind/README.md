# Styly Tailwind pro analýzu Hormuz

Do 22. 11. 2026 se styly generovaly v prohlížeči skriptem Tailwind Play CDN (cdn.tailwindcss.com).
Bezpečnostní pravidla webu (CSP) ten cizí skript blokovala, takže se stránka zobrazovala bez stylů.
Teď jsou styly sestavené dopředu do `tailwind.css` v kořeni projektu.

Po každé změně tříd v `index.html`, `en/index.html`, `app.js` nebo `translations.js` je potřeba styly sestavit znovu:

    npx -y tailwindcss@3.4.17 -c scripts/tailwind/tailwind.config.js -i scripts/tailwind/vstup.css -o tailwind.css --minify

a v obou HTML zvýšit číslo v `tailwind.css?v=…`, aby prohlížeče nenačetly starou verzi.
Pozor na třídy skládané v JavaScriptu z kousků řetězců: Tailwind je v souborech nenajde. Třídy pište celé.
