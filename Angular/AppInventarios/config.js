const fs = require('fs');
const dotenv = require('/app/node_modules/dotenv');

const env = dotenv.parse(fs.readFileSync('/app/.env'));

// Crear la carpeta si no existe
const dir = '/app/src/app';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const fileContent = `
export const environment = {
  production: false,
  apiUrl: 'http://${env.IP_HOST}:${env.API_HOST_PORT}'
};
`;

fs.writeFileSync(`${dir}/environment.ts`, fileContent);
console.log(`Archivo environment.ts generado con IP = ${env.IP_HOST}:${env.API_HOST_PORT}`);
