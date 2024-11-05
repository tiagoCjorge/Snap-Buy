
//permite exportar a função para usar noutro ficheiro
module.exports = {
    emailDados : (email,assunto,menssagem) => {
        const nodemailer = require('nodemailer');
    
        //Criar objeto de transporte com as informações necessárias
        let mailTransporter = nodemailer.createTransport({
            service: process.env.SERVICE,
            host: process.env.HOSTM,
            auth: {
                user: process.env.USERM,
                pass: process.env.PASS
            }
        });     
        // Criar objeto com as informações do remetente, destinatário, assunto do email e do corpo do email em HTML
        let mailDetails = {
            from: process.env.USERM,
            to: email,
            subject: assunto,
            html: menssagem,
        };
         
        //utiliza o objeto de trasnporte para enviar um email com os dados do objeto mailDetails
        mailTransporter.sendMail(mailDetails, function(err, data) {
            if(err) {
                console.log(err);
            } else {
                console.log('Email sent successfully');
            }
        });
    
    },

    emailEncomenda: (email,assunto,menssagem,produtos,quantidades,total,iban) => {
        const nodemailer = require('nodemailer');
        //Criar objeto de transporte com as informações necessárias
        let mailTransporter = nodemailer.createTransport({
            service: process.env.SERVICE,
            host: process.env.HOSTM,
            auth: {
                user: process.env.USERM,
                pass: process.env.PASS
            }
        });    
        let tabela = "";
        let preco = 0;

        for (let i =0;i<produtos.length;i++){
            if(produtos[i].desconto>0){
                 preco = produtos[i].preco - (produtos[i].preco * (produtos[i].desconto /100))
               
            }else{
                 preco = produtos[i].preco
                 
            }
            tabela += `<tr> <td>${produtos[i].nome}</td> <td>${preco}€</td>  <td>${quantidades[i].quantidade}</td>  </tr> `;
        }
        if(iban != ""){
            var sIban = `<br><span> IBAN :  ${iban} </span>`;
        }else{
            var sIban = "";
        }
        // Criar objeto com as informações do remetente, destinatário, assunto do email e do corpo do email em HTML
        let mailDetails = {
            from: process.env.USERM,
            to: email,
            subject: assunto,
            html: `
        <br>
      <h1>Encomenda ${menssagem}</h1>

      <table>

        <tr>

          <th>Produto</th>

          <th>Preço</th>

          <th>Quantidade</th>

        </tr>

        ${tabela}

        <tr>
        <td> Total :</td>
        <td>  ${total} </td>
        </tr>

      </table>
    ${sIban}`,
        };
         
        //utiliza o objeto de trasnporte para enviar um email com os dados do objeto mailDetails
        mailTransporter.sendMail(mailDetails, function(err, data) {
            if(err) {
                console.log(err);
            } else {
                console.log('Email sent successfully');
            }
        });
    },


    
    estadoEncomenda : (email,assunto,menssagem) =>{
        const nodemailer = require('nodemailer');
    
        //Criar objeto de transporte com as informações necessárias
        let mailTransporter = nodemailer.createTransport({
            service: process.env.SERVICE,
            host: process.env.HOSTM,
            auth: {
                user: process.env.USERM,
                pass: process.env.PASS
            }
        });     
        // Criar objeto com as informações do remetente, destinatário, assunto do email e do corpo do email em HTML
        let mailDetails = {
            from: process.env.USERM,
            to: email,
            subject: assunto,
            html: `Encomenda nº` + menssagem,
        };
         
        //utiliza o objeto de trasnporte para enviar um email com os dados do objeto mailDetails
        mailTransporter.sendMail(mailDetails, function(err, data) {
            if(err) {
                console.log(err);
            } else {
                console.log('Email sent successfully');
            }
        });
    },empresaEmail : (email,assunto,menssagem)=>{
        const nodemailer = require('nodemailer');
    
        //Criar objeto de transporte com as informações necessárias
        let mailTransporter = nodemailer.createTransport({
            service: process.env.SERVICE,
            host: process.env.HOSTM,
            auth: {
                user: process.env.USERM,
                pass: process.env.PASS
            }
        });     
        // Criar objeto com as informações do remetente, destinatário, assunto do email e do corpo do email em HTML
        let mailDetails = {
            from: process.env.USERM,
            to: email,
            subject: assunto,
            html: `<h4>`+ menssagem + `</h4>`,
        };
         
        //utiliza o objeto de trasnporte para enviar um email com os dados do objeto mailDetails
        mailTransporter.sendMail(mailDetails, function(err, data) {
            if(err) {
                console.log(err);
            } else {
                console.log('Email sent successfully');
            }
        });
    }
    

}
    
