const { exec } = require("child_process");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function runCommand(command, callback) {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    if (callback) callback();
  });
}

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  const domain = await askQuestion("Enter your domain name: ");
  const port = await askQuestion("Enter your running port: ");

  rl.close();

  const nginxConfig = `
server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://localhost:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;

  runCommand("sudo apt update && sudo apt install -y nginx", () => {
    runCommand(
      `echo "${nginxConfig}" | sudo tee /etc/nginx/sites-available/${domain}`,
      () => {
        runCommand(
          `sudo ln -s /etc/nginx/sites-available/${domain} /etc/nginx/sites-enabled/`,
          () => {
            runCommand("sudo nginx -t", () => {
              runCommand("sudo systemctl restart nginx", () => {
                runCommand(
                  "sudo apt update && sudo apt install -y certbot python3-certbot-nginx",
                  () => {
                    runCommand(`sudo certbot --nginx -d ${domain}`, () => {
                      runCommand("sudo nginx -t", () => {
                        runCommand("sudo systemctl restart nginx", () => {
                          console.log("Nginx setup completed successfully.");
                        });
                      });
                    });
                  }
                );
              });
            });
          }
        );
      }
    );
  });
}

main();
