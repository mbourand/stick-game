import killPort from "kill-port";
/* eslint-disable */

module.exports = async function () {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  try {
    await killPort(port);
  } catch {
    // ignore — port already free
  }
  console.log(globalThis.__TEARDOWN_MESSAGE__);
};
