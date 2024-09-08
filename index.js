import { configDotenv } from "dotenv";
import cors from 'cors';
import express, { response } from 'express';
import { createClient } from '@supabase/supabase-js'
import morgan from 'morgan'
import bodyParser from "body-parser";

const app = express();
configDotenv();

// using morgan for logs
app.use(morgan('combined'));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const supabase = createClient(
    process.env.SUPABASE_PROJECT,
    process.env.SUPABASE_KEY
);


/* FOR QUERY PRICING */
app.get('/prices', async (req, res) => {
    const { data, error } = await supabase
        .from('prices')
        .select('*')
    res.send(data);
});

app.get('/prices/:fecha', async (req, res) => {
    const date = ((new Date(req.params.fecha)).toISOString()).toLocaleString('zh-TW');
    const { data, error } = await supabase
        .from('prices')
        .select('*')
        .gte('created_at', date)
    res.send(data);
});

app.post('/prices', async (req, res) => {
    const { error } = await supabase
        .from('prices')
        .insert([{
            dolarBCV: req.body.dolarBCV,
            euroBCV: req.body.euroBCV,
            dolarPAR: req.body.dolarPAR,
            pesos_colombian: req.body.pesos_colombian
        }]).select()
    if (error) {
        res.send(error);
    }
    res.send("created!!");
});

app.get('/init', async (req, res) => {
    let objTasas = {
        dolarBCV: 0,
        euroBCV: 0,
        dolarPAR: 0,
        pesos_colombian: 0
    };
    const url = process.env.MONITOR_URL;
    await fetch(`${url}/dollar-bcv`, { method: "GET" })
        .then((response) => response.json())
        .then((data) => {
            objTasas.dolarBCV = data.dollar,
                objTasas.euroBCV = data.euro
        });

    await fetch(`${url}/dollar-paralelo`, { method: "GET" })
        .then((response) => response.json())
        .then((data) => {
            objTasas.dolarPAR = data.precio
        });

    await fetch(`${url}/pesos-colombianos`, { method: "GET" })
        .then((response) => response.json())
        .then((data) => {
            objTasas.pesos_colombian = data.precio
        });

    console.log('TENGO LAS TASAS: ', objTasas);

    const { error } = await supabase
        .from('prices')
        .insert([{
            dolarBCV: objTasas.dolarBCV,
            euroBCV: objTasas.euroBCV,
            dolarPAR: objTasas.dolarPAR,
            pesos_colombian: objTasas.pesos_colombian
        }]).select()
    if (error) {
        res.send(error);
    }

    /* ENVIAR MENSAJE AL TELEGRAM */
    const todayIs = new Date()
    const urlTelegram = 'https://api.telegram.org/bot' + process.env.BOT_TELEGRAM + '/sendMessage?chat_id=' + process.env.CHAT_ID + '&parse_mode=Markdown&text=*TASAS-BCV* Actualizado la tasa del dia de hoy: ' + todayIs
    fetch(urlTelegram, { method: "GET"})
    .then((response) => response.json())
    .then((data) => {
        console.log('PETICION COMPLETADA: ', data);
    });


    res.send("created!!");

});


/*
app.put('/prices/:fecha', async (req, res) => {
    const date = ((new Date(req.params.fecha)).toISOString()).toLocaleString('zh-TW');
    const { error } = await supabase
        .from('prices')
        .update({
            dolarBCV: req.body.dolarBCV,
            euroBCV: req.body.euroBCV,
            dolarPAR: req.body.dolarPAR,
            pesos_colombian: req.body.pesos_colombian
        })
        .gte('created_at', date)
    if (error) {
        res.send(error);
    }
    res.send("updated!!");
}); */

app.get('/', (req, res) => {
    res.send("Good Morning, Corriendo el Proyecto :D");
});

app.listen(process.env.PORT, () => {
    console.log(`Corriendo en la siguiente URL: http://localhost:${process.env.PORT}`);
});