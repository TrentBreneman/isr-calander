const FtpDeploy = require("ftp-deploy");

const config = {
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  host: process.env.FTP_HOST,
  port: parseInt(process.env.FTP_PORT) || 21,
  localRoot: __dirname + "/out",
  remoteRoot: "/",
  include: ["*", "**/*", ".*"],
  exclude: [".git/**", ".DS_Store"],
  deleteRemote: true,
  forcePasv: true,
  sftp: false,
};

(async () => {
  try {
    const ftpDeploy = new FtpDeploy();
    await ftpDeploy.deploy(config);
    console.log("🚀 Deployment successful to israutomizer.com");
  } catch (err) {
    console.error("❌ Deployment failed:", err);
    process.exitCode = 1;
  }
})();
