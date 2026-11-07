import env from './config/env';
import app from './app';

app.listen(env.port, () => console.log(`API berjalan di http://localhost:${env.port}`));
