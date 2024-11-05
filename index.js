const mysql = require("mysql");
const bcrypt = require("bcryptjs");
const express = require("express");
const session = require("express-session");
const {emailDados,emailEncomenda, estadoEncomenda, empresaEmail} = require("./public/js/mailer.js");
const fs = require("fs");
const multer = require('multer');


const storage = multer.diskStorage({
  destination: './public/images/produtos',
  filename: (req, file, cb) => {    
   let ext = file.mimetype.split("/")
    
    cb(null, `${Date.now()}--${Math.floor(Math.random() * (10000000000000 - 0) + 1000000000)}.${ext[1]}`);
  },
});
const upload = multer({storage});

require("dotenv").config();
 
const app = express();

const connection = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: "",
  database: process.env.DATABASE,
});

connection.connect((error) => {
  if (error) throw error;
  console.log("Connected to DB");
});

// Configurar a app para usar o mecanismo de visualização ejs
app.set("view-engine", "ejs");
// ler/manipular dados recebidos do html
app.use(express.urlencoded({ extended: true }));

// Esta linha de código permite que o servidor sirva arquivos estáticos, como imagens, CSS e JavaScript, de um diretório específico.
app.use("/public", express.static((__dirname, "public")));

app.use(
  session({
    secret: process.env.SEGREDO,
    resave: true,
    saveUninitialized: true,
  })
);

// home page
app.get("/", function (req, res) {
  //Seleciona os ultimos 12 produtos para serem exibidos na pagina
    connection.query("SELECT * FROM produtos WHERE estado = 1 AND quantidade >0 ORDER BY id DESC LIMIT 12",(error,ultimosProdutos)=>{
      if (error) throw error;
      //Seleciona todas as categorias ordenadas por id
        connection.query("Select * FROM categorias ORDER BY id;",(error,categorias)=>{
          if (error) throw error;
          //Seleciona todas as subcategorias ordenadas por id
          connection.query("Select * from subcat ORDER BY id", (error,subcats)=>{
            if (error) throw error;
            //cria a variavel login para controlar os dados exibidos no menu
            let login = req.session.loggedin || false;
            //renderiza a pagina index.ejs com as variaveis necessarias para o bom funcionamento
              res.render("index.ejs",{ultimosProdutos,categorias,subcats,nrProd : global.nrprod,nrFav:global.nrfav,login});
          });
        });
    });
});
//pagina do login/registar
app.get("/registar", (req, res) => {
  //atribui ás variaveis as mensagens de erro caso o login nao seja bem sucedido
  let errorregi = global.errorregi;
  let errorlogin = global.errorlogin;
  //retira o erro da variavel
  global.errorregi="";
  global.errorlogin="";
 //envia a página com as variaveis que podem ou não conter erros
  res.render("login.ejs", { errorregi, errorlogin});
});

// direciona o utilizador para a devida dashboard
app.get("/dashboard", (req, res) => {
  //verifica se o utilizador fez login
  if ((!req.session.userid && req.session.userid !== 0) || req.session.loggedin === false || undefined) {
    res.redirect("/registar");
  }
  //seleciona os dados do utilizador
  connection.query("SELECT * FROM utilizadores where id = ? ",[req.session.userid],(error, result) => {
      if (error) throw error;
      //atribui os dados de utilizador á variavel dados
      let dados = result[0];
      //Verifica se o utilizador é um vendedor
      if (req.session.vendedor === true) {
          //Seleciona os produtos da empresa disponiveis
        connection.query("SELECT * from produtos where empresa_id = ? AND estado = 1  ORDER BY nome ;", [req.session.empresaid], (error , produtos) => {
          if (error) throw error;
          //Seleciona as categorias
          connection.query("SELECT * FROM categorias ORDER BY nome",(error,categorias)=>{
            if (error) throw error;
            //Seleciona as subcategorias
            connection.query("SELECT * FROM subcat ORDER BY id",(error,subcat)=>{
              if (error) throw error;
              //Seleciona  as encomendas do utilizador
              connection.query("SELECT * FROM encomendas WHERE user_id = ?",[req.session.userid],(error,encomendas)=>{
                if (error) throw error;
                //seleciona os produtos por encomenda do utilizador
                connection.query("SELECT p.id, p.produto_id, p.quantidade, p.encomenda_id, p.total, p.estado FROM prodenc p JOIN encomendas e ON p.encomenda_id = e.id WHERE e.user_id = ?;",[req.session.userid],(error,prodenc)=>{
                  if(error) throw error;
                  //Seleciona os dados dos produtos por encomenda
                  connection.query("SELECT * FROM produtos WHERE id IN (SELECT produto_id FROM prodenc  JOIN encomendas ON prodenc.encomenda_id = encomendas.id WHERE encomendas.user_id = ?); ",[req.session.userid],(error,infoProd)=>{
                    if(error) throw error;
                    //seleciona as encomendas da empresa
                    connection.query("SELECT DISTINCT e.* FROM encomendas e JOIN prodenc pc ON e.id = pc.encomenda_id JOIN produtos p ON pc.produto_id = p.id WHERE p.empresa_id = ? AND pc.enviado = 0;",[req.session.empresaid],(error,encomendasEmp) =>{
                      if(error) throw error;
                      //seleciona os produtos com encomenda aceite da empresa
                      connection.query("SELECT p.* FROM produtos p JOIN prodenc pc ON p.id = pc.produto_id JOIN encomendas e ON pc.encomenda_id = e.id WHERE e.estado = 'Aceite' AND p.empresa_id = ?;",[req.session.empresaid],(error,infoProdEmp)=> {
                        if(error) throw error;
                        //Seleciona todos os registos da tabela prodenc em que tenha a encomenda aceite e o produto pertença a esta empresa
                        connection.query("SELECT p.* FROM prodenc p JOIN encomendas e ON p.encomenda_id = e.id JOIN produtos pr ON p.produto_id = pr.id WHERE e.estado = 'Aceite' AND pr.empresa_id =?;",[req.session.empresaid],(error,prodencEmp)=>{
                          if(error) throw error;
                          let msg = global.addProd;
                          let nrFav = global.nrfav;
                          let nrProd = global.nrprod;
                          let login = req.session.loggedin || false;
                          //Renderiza a página com as variaveis
                          res.render("dashboard_vend.ejs",{login,msg,produtos,categorias,subcat,dados,nrProd,encomendas,prodenc,infoProd,nrFav,encomendasEmp,infoProdEmp,prodencEmp,emp:req.session.empresaid});
                          global.addProd= null;
                        })
                      })          
                    })
                  })
                })
              })
            })
          });
        });
      }

      //admin dashboard
      //verifica se é o administrador
      if (req.session.userid === 0) {
        //Seleciona as empresas
        connection.query("SELECT * FROM empresa WHERE estado = 1 ORDER BY nome", (error, empresa) => {
          if (error) throw error;
          //seleciona os vendedores 
          connection.query("SELECT * FROM vendedores ORDER BY empresa_id", (error, vendedores) => {
            if (error) throw error;
            //Seleciona os utilizadores
            connection.query("SELECT * FROM utilizadores WHERE estado = 1 ORDER BY id",(error, users) => {
                if (error) throw error;
                //Seleciona as encomendas
                connection.query("SELECT * FROM encomendas ORDER BY id DESC",(error,encomendas)=>{
                  if (error) throw error;
                  //Seleciona os produtos por encomenda
                  connection.query("SELECT * FROM prodenc",(error,prodenc)=>{
                    if (error) throw error;
                    //Seleciona todos os produtos
                    connection.query("SELECT * FROM produtos ORDER BY id DESC",(error,produtos)=>{
                      if (error) throw error;
                      //Seleciona o id da empresa,o nome , o total que falta pagar e o nr de produtos 
                      connection.query("SELECT e.id, e.nome, SUM(p.total * p.quantidade) as total,COUNT(p.produto_id) as total_produtos FROM  prodenc p JOIN produtos pr ON p.produto_id = pr.id JOIN empresa e ON pr.empresa_id = e.id WHERE p.estado = 0 AND p.enviado = 1 GROUP BY  e.id, e.nome;",(error,pagamentos)=>{
                        if (error) throw error;
                        //Seleciona todas as alterações a produtos dos ultimos 7 dias
                        connection.query("SELECT * FROM alteracoes WHERE data >= DATE_SUB(CURDATE(), INTERVAL 7 DAY);",(error,alteracoes)=>{
                          if (error) throw error;
                          //Seleciona as encomendas de utilizador
                          connection.query("SELECT * FROM encomendas WHERE user_id = ?",[req.session.userid],(error,mEncomendas)=>{
                            if (error) throw error;
                            //Seleciona os pedidos de empresa
                            connection.query("SELECT * FROM pedidos",(error,pedidos)=>{
                              if (error) throw error;
                              //Seleciona as categorias
                              connection.query("SELECT * FROM categorias",(error,categorias)=>{
                                if (error) throw error;
                                let login = req.session.loggedin || false
                                //renderiza a pagina com as variaveis
                                res.render("dashboard_admin.ejs", {categorias,login,empresa,vendedores,users,nrProd:global.nrprod,nrFav:global.nrfav,encomendas,prodenc,produtos,pagamentos,alteracoes,dados,mEncomendas,pedidos});
                              })
                            })
                          });
                        })
                      })
                    })
                  })
                });
              }
            );
          });
        });
        //dashboard dono de empresa
        //verifca se é dono de empresa
      } else if (req.session.vendedor !== true) {
        //Seleciona o registo de empresa registado com id de utilizador
        connection.query("SELECT * from empresa WHERE user_id = ? AND estado = 1",[req.session.userid],(error, result) => {
            if (error) throw error;
            //verifica se
            if (result.length > 0) {
              //seleciona os produtos da empresa
              connection.query("SELECT * FROM produtos WHERE empresa_id = ? AND estado =1",[req.session.empresaid],(error,produtos)=>{
                if (error) throw error;
                //seleciona o id de vendedor, o nome e email de utilizador
                connection.query("SELECT v.id, u.nome, u.email, u.telemovel FROM vendedores v INNER JOIN utilizadores u ON v.user_id = u.id WHERE v.empresa_id = ? AND v.estado = 1;",[req.session.empresaid],(error,vendedores)=>{
                  if (error) throw error;
                  //seleciona as encomendas da empresa
                  connection.query("SELECT DISTINCT e.* FROM encomendas e JOIN prodenc pc ON e.id = pc.encomenda_id JOIN produtos p ON pc.produto_id = p.id WHERE p.empresa_id = ? AND pc.enviado = 0;",[req.session.empresaid],(error,encomendasEmp)=>{
                    if (error) throw error;
                    //Seleciona todos os registos da tabela prodenc em que tenha a encomenda aceite e o produto pertença a esta empresa
                    connection.query("SELECT p.* FROM prodenc p JOIN encomendas e ON p.encomenda_id = e.id JOIN produtos pr ON p.produto_id = pr.id WHERE e.estado = 'Aceite' AND pr.empresa_id =?;",[req.session.empresaid],(error,prodencEmp)=>{
                      if (error) throw error;
                      //seleciona os produtos com encomenda aceite
                      connection.query("SELECT p.* FROM produtos p JOIN prodenc pc ON p.id = pc.produto_id JOIN encomendas e ON pc.encomenda_id = e.id WHERE e.estado = 'Aceite' AND p.empresa_id = ?;",[req.session.empresaid],(error,infoProdEmp)=> {
                        if (error) throw error;
                        //Seleciona as subcategorias
                        connection.query("SELECT * FROM subcat ORDER BY id;",(error,subcat)=>{
                          if (error) throw error;
                          //Seleciona as categorias
                          connection.query("SELECT * FROM categorias ORDER BY nome;",(error,categorias)=>{
                            if (error) throw error;
                            //Seleciona as alterações dos produtos da empresa
                            connection.query("SELECT a.* FROM alteracoes a INNER JOIN produtos p ON a.produto_id = p.id WHERE p.empresa_id = ? AND data >= DATE_SUB(CURDATE(), INTERVAL 7 DAY);;",[req.session.empresaid],(error,alteracoes)=>{
                              if (error) throw error;
                              //Seleciona as encomendas do utilizador
                              connection.query("SELECT * FROM encomendas WHERE user_id = ?",[req.session.userid],(error,encomendas)=>{
                                if (error) throw error;
                                //Seleciona os produtos que estão encomendados pelo utilizador
                                connection.query("SELECT p.id, p.produto_id, p.quantidade, p.encomenda_id, p.total, p.estado FROM prodenc p JOIN encomendas e ON p.encomenda_id = e.id WHERE e.user_id = ?;",[req.session.userid],(error,prodenc)=>{
                                  if (error) throw error;
                                  //Seleciona os dados dos produtos encomendados para preencher com a função JS
                                  connection.query("SELECT * FROM produtos WHERE id IN (SELECT produto_id FROM prodenc  JOIN encomendas ON prodenc.encomenda_id = encomendas.id WHERE encomendas.user_id = ?);",[req.session.userid],(error,infoProd)=>{
                                    if (error) throw error;
                                    let nrFav = global.nrfav;
                                    let nrProd = global.nrprod
                                    let login = req.session.loggedin || false
                                    //renderiza a dashboard com as variaveis
                                    res.render("dashboard_emp.ejs",{login,nrFav,nrProd,produtos,vendedores,encomendasEmp,prodencEmp,infoProdEmp,subcat,categorias,alteracoes,dados,encomendas,prodenc,infoProd,emp:req.session.empresaid});
                                  })
                                })
                              })
                            })
                          })
                        })
                      })
                      })
                  })
                })
              })
              //dashboard cliente
            } else if (req.session.vendedor !== true && req.session.userid !== 0) {
              let msgM = global.msgM ;
              //Seleciona as encomendas do utilizador
             connection.query("SELECT * from encomendas WHERE user_id = ?",[req.session.userid],(error,encomendas)=>{
              if(error) throw error;
              //Seleciona os produtos por encomenda 
              connection.query("SELECT p.id, p.produto_id, p.quantidade, p.encomenda_id, p.total, p.estado FROM prodenc p JOIN encomendas e ON p.encomenda_id = e.id WHERE e.user_id = ?;",[req.session.userid],(error,produtos)=>{
                if(error) throw error;
                //Seleciona a informação dos produtos presentes nas encomendas
                connection.query("SELECT * FROM produtos WHERE id IN (SELECT produto_id FROM prodenc  JOIN encomendas ON prodenc.encomenda_id = encomendas.id WHERE encomendas.user_id = ?); ",[req.session.userid],(error,infoProd)=>{
                  if(error) throw error;
                  //Seleciona as categorias
                  connection.query("SELECT * FROM categorias",(error,categoria)=>{
                    if(error) throw error;
                    let login = req.session.loggedin || false
                    //renderiza a dashboard e as variaveis
                    res.render("dashboard.ejs", { msgM, dados,nrProd:global.nrprod,encomendas,produtos,infoProd,nrFav:global.nrfav,categoria,login});
                  })
                })
              })
             })
            }
          }
        );
      }
    }
  );
});

app.get("/favoritos",(req,res)=>{
//verifica se o utilizador fez login
if (req.session.loggedin === true && req.session.userid !== undefined) {
  //Seleciona os produtos que estão nos favoritos do utilizador
  connection.query("SELECT * FROM produtos WHERE id IN ( SELECT produto_id  FROM favoritos   WHERE user_id = ?)",[req.session.userid],(error,produtos)=>{
    if (error) throw error;
    //Seleciona todas as categorias para o menu
    connection.query("SELECT * FROM categorias ",(error,categoria)=>{
      if (error) throw error;
      let login = req.session.loggedin || false;
      //renderiza a página com as variaveis
      res.render("favoritos.ejs",{produtos,nrProd:global.nrprod,login,categoria})
    })
   });
}else{
  //redireciona para a rota /registar
  res.redirect("/registar")
};
});

//Adicionar produto aos favoritos
app.get("/favoritos=:id",(req,res)=>{
  //verifica se o utilizador fez login
  if(req.session.loggedin == true && req.session.userid !== undefined){
    //Verifica se o produto ja está nos favoritos
    connection.query("SELECT * FROM favoritos WHERE user_id=? AND produto_id=?",[req.session.userid,req.params.id],(error,result)=>{
      if (error) throw error;
      if (result.length>0){
        //Redireciona para a ultima página se ja existir o produto nos favoritos
        res.redirect("back")
      }else{
        //Faz a query para adicionar o produto aos favoritos
        let sql = "INSERT INTO favoritos (user_id,produto_id) VALUES (?,?)";
        let valores = [req.session.userid,req.params.id]
        connection.query(sql,valores,(error)=>{
          if (error) throw error;
          //aumenta o numero de produtos nos favoritos para mostrar no icon
          global.nrfav += 1;
        })
        //redireciona para a ultima página
        res.redirect("back");
      }
    })
  }else{
    //redireciona para a rota /registar
    res.redirect("/registar")
  }
});
//Remove o produto dos favoritos
app.get("/rmvFavoritos=:id",(req,res)=>{
  let sql="DELETE FROM favoritos WHERE produto_id = ? AND user_id = ?;";
  let valores=[req.params.id,req.session.userid];
  connection.query(sql,valores,(error)=>{
    if (error) throw error;
    //Diminui o numero de produtos nos favoritos
    global.nrfav -=1;
  })
  res.redirect("back")
});



//pagina carrinho
app.get("/cart", (req, res) => {
  //verifica se o utilizador fez login
  if (req.session.loggedin === true && req.session.userid !== undefined) {
    //Gera o html no servidor e envia para o cliente
    connection.query("SELECT * FROM utilizadores WHERE id = ?",[req.session.userid],(error,dados)=>{
      if (error) throw error;
      //Seleciona toda a informação dos produtos com estado = 1 que estejam na tabela prodcar e no carrinho
      connection.query("SELECT * FROM produtos WHERE id IN (SELECT DISTINCT produto_id from prodcar where carrinho_id = ?) AND estado = 1 ;",[req.session.carrinho],(error,produtos)=>{
        if (error) throw error;
        //Seleciona as quantidades de cada produto no carrinho
          connection.query("SELECT quantidade from prodcar where carrinho_id = ?",[req.session.carrinho],(error,quantidades)=>{
            if (error) throw error;
            //Seleciona todas a categorias
           connection.query("SELECT * FROM categorias",(error,categoria)=>{
            if (error) throw error;
            //cria a variavel login para controlar os dados exibidos no menu
            let login = req.session.loggedin || false;
            res.render("cart.ejs",{login,produtos,quantidades,dados,nrFav:global.nrfav,categoria});
           })
          })   
      })
    })
  } else {
    //redireciona para a rota /registar se não fez login
    res.redirect("/registar");
  }
});

//Adicionar produtos ao carrinho
app.post("/carrinho",(req,res)=>{
  //Verifica se o utilizador fez login
  if(req.session.loggedin === true && req.session.userid !== undefined){
      //Tem varias maneiras de receber os dados devido a diferentes formulários
      let prodindexid =  Object.keys(req.body).find(key => key.startsWith('idProd'));
      let prodindexquant = Object.keys(req.body).find(key => key.startsWith('quantProd'));
      let prod_id = req.body.idProd || req.body[prodindexid];
      let quant = req.body.quantProd || req.body[prodindexquant] ||1;
       //Verifica se o produto ja está no carrinho
       connection.query("SELECT * FROM prodcar WHERE produto_id = ? and carrinho_id = ?",[prod_id,req.session.carrinho],(error,result)=>{
        if (error)  throw error;
          if (result.length>0){
            //se o produto existir e quantidade for 1 aumenta a quantidade do produto
            if(quant!= req.body.quantProd && quant != req.body[prodindexquant] && quant == 1){
              let sql =  "UPDATE prodcar set quantidade = quantidade + ? WHERE produto_id = ? and carrinho_id = ? ";
              let valores = [quant,prod_id,req.session.carrinho];
              //faz a query para realizar o update
              connection.query(sql, valores, (error) => {
                if (error)  throw error;
              });
            }else{
                //Alterar a quantidade de produto no carrinho 
              let sql =  "UPDATE prodcar set quantidade = ? WHERE produto_id = ? and carrinho_id = ? ";
              let valores = [quant,prod_id,req.session.carrinho];
              //faz a query para realizar o update
              connection.query(sql, valores, (error) => {
                if (error)  throw error;
              });
            }
       }else{
        //se nao existir o produto, adiciona
        let sql =  "INSERT INTO prodcar (produto_id,carrinho_id,quantidade) values (?,?,?)";
        let valores = [prod_id,req.session.carrinho,quant];
        connection.query(sql, valores, (error) => {
          console.log("req.session : ",req.session.nrProd)
          if (error) {
            throw error;
          }else{
            //se não der erro aumento o nr de produtos no carrinho para mostrar o icon
            global.nrprod += 1;
            console.log("global.nrprod: ",global.nrprod)
          }
       })};
       }); 
       //redireciona para a ultima página
     res.redirect("back");
    }else{
      //redireciona para a rota /registar
      res.redirect("/registar")
    }
});
//Remove o produto do carrinho
app.get("/rmvCarrinho=:id",(req,res)=>{
  //Seleciona o respetivo registo na tabela prodcar 
  connection.query("SELECT id FROM prodcar WHERE produto_id = ? AND carrinho_id = ?;",[req.params.id,req.session.carrinho],(error,result)=>{
    if(error) throw error;
    sql = "DELETE FROM prodcar WHERE id = ? ";
    valor = [result[0].id];
    //realiza a query para eliminar o produto do carrinho
    connection.query(sql,valor,(error)=>{
      if (error) throw error;
    })
  })
  //Diminui o numero de produtos no carrinho
  global.nrprod -= 1
  //Redireciona para a ultima página
  res.redirect("back")
});





//Página do produto
//Na rota o :id é o id do produto
app.get("/produto=:id",(req,res)=>{
  //Seleciona o produto 
  connection.query("SELECT * FROM produtos where id = ?",[req.params.id],(error,produto)=>{
    //Verifica se existe o id do produto
    if(produto.length>0){
    if (error) throw error;
    //Seleciona categoria e subcategoria do produto
    connection.query("(SELECT * FROM categorias WHERE id = (SELECT categoria_id FROM subcat WHERE id = ?)) union (SELECT id,nome from subcat where id=?);",[produto[0].subcategoria_id,produto[0].subcategoria_id],(error,categoria)=>{
      if (error) throw error;
        //Seleciona no maximo 4 produtos com a mesma categoria para os relacionados
      connection.query("SELECT p.* FROM produtos p WHERE p.subcategoria_id IN ( SELECT sc.id FROM subcat sc WHERE sc.categoria_id = ( SELECT sc2.categoria_id FROM subcat sc2 WHERE sc2.id = ? )AND p.id <> ? AND estado = 1 AND quantidade >0) LIMIT 4; ",[produto[0].subcategoria_id,produto[0].id],(error,relatedProd)=>{
        if (error) throw error;
        //cria a variavel login para controlar os dados exibidos no menu       
        let login = req.session.loggedin || false;
        //renderiza a pagina com as variaveis
        res.render("produtos.ejs",{produto,categoria,relatedProd,nrProd:global.nrprod,nrFav : global.nrfav,login});
      })
    })
  }else{
    res.redirect("/")
  }
  });
});

//apagar produto
app.get("/rmvProd=:id",(req,res)=>{
  //query para alterar o estado do produto para 0
  let sql = "UPDATE produtos SET estado = 0 WHERE id = ?;";
  let valor = [req.params.id];
  connection.query(sql,valor,(error)=>{
    if (error) throw error;
  })
  res.redirect("back");
});

//direciona o utilizador para a pagina com produtos da subcategoria
app.get("/subcat=:id",(req,res)=>{
  //Seleciona as categorias
  connection.query("SELECT * FROM categorias",(error,categorias)=>{
    if (error) throw error;
    //Seleciona as subcategorias
    connection.query("SELECT * FROM subcat",(error,subcats)=>{
      if (error) throw error;
      //Seleciona os produtos com a mesma subcategoria
      connection.query("SELECT * FROM produtos where subcategoria_id = ? AND estado = 1 AND quantidade >0;",[req.params.id],(error,produtos)=>{
        if (error) throw error;
        //seleciona as empresas
        connection.query("SELECT * FROM empresa",(error,empresas)=>{
         if (error) throw error;
          //cria a variavel login para controlar os dados exibidos no menu       
          let login = req.session.loggedin || false ;  
          //renderiza a pagina com as variaveis
         res.render('category-market.ejs',{login,categorias,subcats,produtos,empresas,nrProd : global.nrprod,nrFav:global.nrfav})
        })
      })
    })
  })
});

//página de produtos com a mesma categoria
app.get("/cat=:id",(req,res)=>{
  //Seleciona as categorias
connection.query("SELECT * FROM categorias",(error,categorias)=>{
  if (error) throw error;
  //Seleciona as subcategorias
  connection.query("SELECT * FROM subcat",(error,subcats)=>{
    if (error) throw error;
    //Seleciona os produtos da mesma categoria
    connection.query("SELECT * FROM produtos where subcategoria_id IN (SELECT id FROM subcat WHERE categoria_id = ?) AND estado = 1 AND quantidade >0",[req.params.id],(error,produtos)=>{
      if (error) throw error;
      //Seleciona as empresas
      connection.query("SELECT * FROM empresa",(error,empresas)=>{
       if (error) throw error;
          //cria a variavel login para controlar os dados exibidos no menu
          let login = req.session.loggedin || false ;  
          //Renderiza a página com as variaveis
          res.render('category-market.ejs',{categorias,subcats,produtos,empresas,catid:req.params.id,nrProd:global.nrprod,nrFav:global.nrfav,login})
      })
    })
  })
})
});


app.get("/sobre",(req,res)=>{
  //Seleciona as categorias para o menu
  connection.query("SELECT * FROM categorias",(error,categoria)=>{
    if (error) throw error;
      //cria a variavel login para controlar os dados exibidos no menu
    let login = req.session.loggedin || false;
     //Renderiza a página com as variaveis
    res.render("about.ejs",{nrProd:global.nrprod,nrFav:global.nrfav,login,categoria})
  })
});

app.get("/faq",(req,res)=>{
  //cria a variavel login para controlar os dados exibidos no menu
  let login = req.session.loggedin || false
  //Seleciona as categorias para o menu
  connection.query("SELECT * FROM categorias",(error,categoria)=>{
    if (error) throw error;
    //Renderiza a página com as variaveis
    res.render('faq.ejs',{nrProd:global.nrprod,nrFav:global.nrfav,login,categoria})
  })
});


//Sair
app.get("/sair", (req, res) => {
  //destroi as variaveis de sessão
  req.session.destroy();
  //redireciona para a rota inicial
  res.redirect("/");
});

//criar conta / criar vendedor
app.post("/registar", (req, res) => {
  //Seleciona o email inserido
  connection.query("SELECT email FROM utilizadores WHERE email = ?",[req.body.register_email], (error, result) => {
      if (error) throw error;
      //Verifica se já existe o email
      if (result.length > 0) {
          //cria a variavel global com o mensagem para mostrar
          global.errorregi = "O Email fornecido já existe.";
          //redireciona para a ultima pagina
          res.redirect("back");
      } else {
        //verifica se as palavras-passe introduzidas são iguais
        if (req.body.register_password === req.body.register_password2) {
          // gera o "salt" (string) aleatorio para encriptar a palavra-passe
          bcrypt.genSalt(11, function (error, salt) {
            if (error) throw error;
            //faz a encriptação da palavra-passe e na função insere na base de dados
            bcrypt.hash(req.body.register_password, salt, function (error, hash) {
              if (error) throw error;
           
              //variavel com a query para inserir o utilizador
              let sql = "INSERT INTO utilizadores (nome,email,senha,telemovel,morada,codpost,cidade,pais,estado) VALUES (?,?,?,?,?,?,?,?,?);";
              //valores da query
              let valores = [req.body.nome, req.body.register_email, hash,req.body.register_telemovel," , ","","","",1];
              //executar a query com os valores
              connection.query(sql, valores,(error)=>{
                if (error) throw error;
              });
              //Seleciona o id do utilizador recem criado e cria um carrinho para o mesmo
              connection.query("SELECT * FROM utilizadores ORDER BY id DESC LIMIT 1",(error,result)=>{
                if (error) throw error;
                let sql = "INSERT INTO carrinho (user_id) VALUES (?);";
                let valor = [result[0].id];
                connection.query(sql,valor,(error)=>{
                  if (error) throw error;
                })
                //se for o dono da empresa a criar a conta de vendedor , é registado como vendedor
                if(req.session.empresaid){
                  let sql = "INSERT INTO vendedores (empresa_id,user_id,estado) VALUES (?,?,?);";
                  let valores = [req.session.empresaid,result[0].id,1];
                  connection.query(sql,valores,(error)=>{
                    if (error) throw error;
                  })
               }
              })
              //redireciona para a rota inicial
              res.redirect("/");
            });
          });
        } else {
          //cria a variavel de global com a mensagem de error a exibir
          global.errorregi = "As passwords têm  de ser iguais.";
          res.redirect("/registar");
        }
      }
    }
  );
});

//Verifica os dados de login
app.post("/auth", (req, res) => {
  // Guardar o valor dos inputs
  let email = req.body.singin_email_2;
  let pass = req.body.singin_password_2;
  // Procura por algum utilizador com o email introduzido e a lista de vendedores
  connection.query("select * from (select id,email,senha from utilizadores where email = ? AND estado = 1) as users, ( select empresa_id,user_id,estado from vendedores WHERE estado = 1 ) as vendedores;", [email],(error, results) => {
      if (error) throw error;
      // verifica se existe resultados com o email fornecido
      if (results.length > 0) {
        //verifica a comparação da pass introduzida com a da base de dados
        if (bcrypt.compareSync(pass, results[0].senha)) {
        //confirma se o utilizador está registado como vendedor
          for (let i = 0; i<results.length;i++){
            if (results[i].user_id == results[0].id){
              // Criar variaveis de sessão para autenticar como vendedor
              req.session.vendedor = true;
              req.session.empresaid = results[0].empresa_id
              break;
            }
         } 
        //confirma se é dono de empresa
          connection.query("SELECT * FROM empresa WHERE user_id = ?",[results[0].id],(error,empresa)=>{
            if (error) throw error;
            if (empresa.length>0){
              // Criar variaveis de sessão para autenticar como dono de empresa
              req.session.empresaid = results[0].empresa_id;
            }
          })
          //Seleciona o id do carrinho do utilizador
        connection.query("select id from carrinho where user_id = ?",[results[0].id], (error,carrinho) =>{
          if (error) throw error;
          //Seleciona o total de produtos no carrinho de quem fez login
            connection.query("SELECT COUNT(*) as nr FROM prodcar WHERE carrinho_id = ?;",[carrinho[0].id],(error,nrProd) =>{
              //Seleciona os produtos nos favoritos de quem fez login
              connection.query("SELECT COUNT(*) as nr FROM favoritos WHERE user_id = ?;",[results[0].id],(error,nrFav)=>{
                 // Criar variaveis de sessão para autenticar
                req.session.userid = results[0].id;
                req.session.email = results[0].email;
                req.session.loggedin = true;
                req.session.carrinho = carrinho[0].id;
                global.nrprod = nrProd[0].nr;
                global.nrfav = nrFav[0].nr;
                res.redirect("/");
              })
            });
        })        
        } else {
          //define a variavel global com o erro de login e redireciona para a rota /registar
          global.errorlogin = "Dados Incorretos";
          res.redirect("/registar");
        }
      } else {
         //define a variavel global com o erro de login e redireciona para a rota /registar
        global.errorlogin = "Dados Incorretos";
        res.redirect("/registar");
      }
    }
  );
});

//atualizar dados da conta
app.post("/conta", (req, res) => {
  //Atribuir os valores do formulario e a data a variaveis 
  let data = new Date(Date.now());
  let nome = req.body.cnome || req.body.Vnome
  let email = req.body.cemail || req.body.Vemail;
  let tel = req.body.ctel ||req.body.Vtel;
  let pass = req.body.cpass ||req.body.Vpass;
  let passn = req.body.cpassn ||req.body.Vpassn;
  let cpassn = req.body.ccpassn ||req.body.Vcpassn;
  //Verifica se alterou ou não alterou a password
  if (!pass && !passn && !cpassn) {
    let sql =  "UPDATE utilizadores SET nome = ? , email = ? , telemovel = ?  WHERE id = " +  req.session.userid + ";";
    let valores = [nome, email, tel];
    //faz a query para atualizar os dados
    connection.query(sql, valores, (error) => {
      if (error) {
        throw error;
      }
    });
    //atualiza a variavel de sessao com o email novo
    req.session.email = email;
    res.redirect("/dashboard");
  } else {
    //seleciona a password 
    connection.query("SELECT senha FROM utilizadores WHERE id = ?",[req.session.userid], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
          //verifica se a password atual introduzida corresponde a password guardada
          if (bcrypt.compareSync(pass, results[0].senha)) {
            bcrypt.genSalt(11, (err, salt) => {
              //verifica se ambos os inputs para a password nova têm os mesmo conteudo
              if (passn === cpassn) {
                bcrypt.hash(cpassn, salt, function (err, hash) {
                  //query para atualizar os dados pessoais do utilizador
                  let sql = "UPDATE utilizadores SET nome = ?, email = ? , senha = ? , telemovel = ? WHERE id = " + req.session.userid +";";
                  let valores = [nome, email, hash, tel];
                  //realiza a query de update 
                  connection.query(sql, valores);
                  //atualiza a variavel de sessao
                  req.session.email = email;
                  //redireciona para a rota /dashboard
                  res.redirect("/dashboard");
                });
              }
            });
          }
        }
      }
    );
  }
                    //função do ficheiro mailer.js que utiliza o modulo nodemailer para enviar email ao utilizador
                    emailDados(req.session.email,"Alteração de Dados","<p> Dados alterados com sucesso. <br>" + data +"</p>");
});

//mudar morada/dados de envio
app.post("/morada", (req, res) => {
  //atribui os valores do formulario a variaveis
  let rua = req.body.rua.trim();
  let nr = req.body.nr.trim();
  let codpost = req.body.codpost;
  let cidade = req.body.cidade;
  let pais = req.body.pais;

  //junta a rua e o numero numa só variavel
  let morada = rua + " , " + nr;
  //query para atualizar os dados de envio/morada
  let sql =    "UPDATE utilizadores SET morada = ? , codpost = ? , cidade = ? ,pais = ? WHERE id = " +req.session.userid + ";";
  let valores = [morada, codpost, cidade, pais];
  connection.query(sql, valores, (error) => {
    if (error) {
      throw error;
    }
  });
  //variavel global com mensagem para ser exibida
  global.msgM = "Guardado com sucesso!";
  //redireciona para a rota /dashboard
  res.redirect("/dashboard");
});

//fazer pedido de empresa
app.post("/pedidos",(req,res)=>{
    //Verifica se o utilizador não é vendedor 
    connection.query("SELECT * FROM vendedores WHERE user_id = ?",[req.session.userid],(error,vendedores)=>{
      if(error) throw error;
      //Verifica se o utilizador tem alguma empresa
      connection.query("SELECT * FROM empresa WHERE user_id = ? ",[req.session.userid],(error,empresas)=>{
        if(error) throw error;
         //Verifica se já fez algum pedido para empresa
        connection.query("SELECT * FROM pedidos WHERE user_id = ?",[req.session.userid],(error,pedidos)=>{
          if(error) throw error;
          //se for vendedor ou tiver empresa ou algum pedido de empresa não envia
          if(vendedores.length>0 || empresas.length>0 || pedidos.length>0){
            res.redirect("back");
          }else{
            //se for um utilizador normal sem pedidos de empresa cria o pedido
            let sql="INSERT INTO pedidos (nome,user_id,email,morada,codpost,cidade,pais) VALUES (?,?,?,?,?,?,?);";
            let morada = req.body.ruaEmp + " , " + req.body.nrEmp;
            let valores =[req.body.nomeEmp,req.session.userid,req.body.emailEmp,morada,req.body.codpostEmp,req.body.cidadeEmp,req.body.paisEmp];
            //query para inserir o pedido 
            connection.query(sql,valores,(error)=>{
              if(error) throw error;
            })
            //função do Mailer.js para enviar email relativo ao pedido
            empresaEmail(req.session.email,"Junta-te à Snap Buy !!!","O pedido foi enviado, assim que possivel irá ser contactado por email.");
            //Redireciona para a ultima página
            res.redirect("back");
          }
        })
      })
    })
});

//Aprovar pedido de empresa
app.get("/pedidos=:id",(req,res)=>{
    //Seleciona o pedido correto
    connection.query("SELECT * FROM pedidos WHERE id = ? ",[req.params.id],(error,result)=>{
      if (error) throw error;
      //regista a empresa com as informações do pedido
      let sql = "INSERT INTO empresa (nome,user_id,email,morada,codpost,cidade,pais,estado) VALUES (?,?,?,?,?,?,?,?);";
      let valores = [result[0].nome,result[0].user_id,result[0].email,result[0].morada,result[0].codpost,result[0].cidade,result[0].pais,1];
      connection.query(sql,valores,(error)=>{
        if (error) throw error;
      })
      //apaga o registo do pedido
      sql = "DELETE FROM pedidos WHERE id = ?";
      valores = [req.params.id];
      connection.query(sql,valores,(error)=>{
        if(error)throw error;
      })
    })
    //Seleciona o email de quem fez o pedido
    connection.query("SELECT email FROM utilizadores WHERE id = ?",[result[0].user_id],(error,email)=>{
      if(error)throw error;
      //função do Mailer.js para enviar email relativo ao pedido
      empresaEmail(email[0].email,"Parte da Snap Buy !","O pedido foi aceite, agora fazes parte da Snap Buy. \n Já podes vender os teus produtos na nossa plataforma.");
    })
    res.redirect("back");
});
//pagamentos a empresas
app.get("/pagamento=:id",(req,res)=>{
  //Seleciona todos os produtos por encomenda com o estado = 0 (não pago)
  connection.query("SELECT * FROM prodenc WHERE estado = 0",(error,prodenc)=>{
    if(error)throw error;
    //Seleciona os dados dos produtos da empresa a pagar
   connection.query("SELECT * FROM produtos WHERE empresa_id = ?",[req.params.id],(error,prod)=>{
    if(error)throw error;
    //Altera o estado de todos os produtos da empresa selecionada para 1(pagos)
    for(let i =0;i<prodenc.length;i++){
      for(let j = 0;j<prod.length;j++){
        if(prodenc[i].produto_id == prod[j].id){
          //query para alterar o estado para 1
          let sql = "UPDATE prodenc SET estado = 1 WHERE produto_id = ?;";
          let valores = [prod[j].id];
          connection.query(sql,valores,(error)=>{
            if(error)throw error;
          })
        }
      }
    }
   })
  })
  //redireciona para a pagina anterior
  res.redirect("back")
});

//editar empresa 
app.post("/editar-empresa",(req,res)=>{
  //query para atualizar os dados da empresa para os dados inseridos no formulário
  let sql = "UPDATE empresa SET nome= ?,email = ?,morada = ?,codpost = ?,cidade = ?,pais = ? WHERE id = ? ;";
  let valores = [req.body.editarNomeE,req.body.editarEmailE,req.body.editarMoradaE,req.body.editarCidadeE,req.body.editarCodpostE,req.body.editarPaisE,req.body.editaridE];
  connection.query(sql,valores,(error)=>{
    if(error) throw error;
  })
  //redireciona para a ultima pagina
  res.redirect("back");
});
//remover empresa
app.get("/rmvEmp=:id",(req,res)=>{
  let sql,valores;
  //seleciona os produtos da empresa selecionada
    connection.query("SELECT * FROM produtos WHERE empresa_id = ?",[req.params.id],(error,result)=>{
      if(error) throw error;
      //altera o estado de todos os produtos da empresa a remover para 0
      for(let i=0;i<result.length;i++){
        sql = "UPDATE produtos SET estado = 0 WHERE id = ?;";
        valores=[result[i].id];
        connection.query(sql,valores,(error)=>{
          if(error) throw error;
        })
      }
    })
    //query para aleterar o estado da empresa para 0
  sql = "UPDATE empresa SET estado = 0 WHERE id = ?;";
   valores=[req.params.id];
  connection.query(sql,valores,(error)=>{
    if(error) throw error;
  })
  //redireciona para a ultima pagina
  res.redirect("back");
});
//Editar vendedores
app.post("/editar-vendedores",(req,res)=>{
    //query para alterar o estado do utilizador selecionado 
     let sql = "UPDATE vendedores SET estado = ? WHERE id = ?";
      let valores = [req.body.editarEstadoV,req.body.id];
      connection.query(sql,valores,(error)=>{
        if(error)throw error;
      })
  res.redirect("back");
});
//Editar utilizadores (admin)
app.post("/editar-users",(req,res)=>{
  let sql,valores;
  //verifica se alterou a password
  if(!req.body.editarPassword){
    //se não alterou a password edita o utilizador selecionado com os dados do formulario
    sql = "UPDATE utilizadores SET nome = ? ,email = ?, telemovel = ?,morada = ?,codpost = ?, cidade = ?,pais =? WHERE id = ?;";
    valores=[req.body.editarNomeU,req.body.editarEmailU,req.body.editarNrU,req.body.editarMoradaU,req.body.editarCodpostU,req.body.editarCidadeU,req.body.editarPaisU,req.body.idU];
    connection.query(sql,valores,(error)=>{
      if(error)throw error;
    })
  }else{
    //se alterou a password, edita todos os dados do utilizador
    sql = "UPDATE utilizadores SET nome = ? ,email = ?, senha = ?, telemovel = ?,morada = ?,codpost = ?, cidade = ?,pais =? WHERE id = ?;";
    //gera o "salt" para encriptar a password nova
      bcrypt.genSalt(11,(err,salt)=>{
        //faz a encriptação da password nova e a query para guardar tudo 
        bcrypt.hash(req.body.editarPassword, salt, function (err, hash) {
          valores=[req.body.editarNomeU,req.body.editarEmailU,hash,req.body.editarNrU,req.body.editarMoradaU,req.body.editarCodpostU,req.body.editarCidadeU,req.body.editarPaisU,req.body.idU];
          connection.query(sql,valores,(error)=>{
            if(error)throw error;
          })
        })
      })
  }
  res.redirect("back");
});

//Adiciona produtos
app.post("/addProdutos", upload.single('image_homepage'), (req,res,next)=>{
  //Verifica se foi introduzida uma foto e uma subcategoria
if(req.file && req.body.selectCat){
  //faz a query para inserir o produto com os respetivos valores do formulario
  let sql = "INSERT INTO produtos (nome,descricao,preco,empresa_id,subcategoria_id,foto,quantidade,desconto,estado) VALUES (?,?,?,?,?,?,?,?,1) ";
  let valores = [req.body.nomeProd, req.body.descri, req.body.preco, req.session.empresaid,req.body.selectHide,req.file.filename ,req.body.quant,0];
  connection.query(sql, valores, (error) => {
    if (error)throw error;
  });
  //Seleciona o id de vendedor e o id do produto acabado de inserir
  connection.query("SELECT (SELECT id FROM vendedores WHERE user_id = ?) AS id_vendedor, (SELECT id FROM produtos WHERE empresa_id = ? ORDER BY id DESC LIMIT 1) AS id_produto;",[req.session.userid,req.session.empresaid],(error,result)=>{
    if(error)throw error;
    //verifica se foi o vendedor ou o dono da empresa a alterar
    if(result[0].id_vendedor !== null){
      //faz a query para inserir na tabela alteracoes
       sql = "INSERT INTO alteracoes (vendedor_id,produto_id,data,tipo) VALUES (?,?,?,?);"
       // cria uma variavel com a data no formato YYYY/MM/DD HH:MM:SS
      let date = new Date()
      let data = date.toISOString().slice(0, 19).replace('T', ' ');
      valores=[result[0].id_vendedor,result[0].id_produto,data,"Inseriu Produto"];
      connection.query(sql,valores, (error)=>{                  
        if(error)throw error;
      }) 
    }else{
      //faz o registo diferente caso seja o dono da empresa a inserir o produto
      connection.query("SELECT id FROM produtos WHERE empresa_id = ? ORDER BY id DESC LIMIT 1;",[req.session.empresaid],(error,produto)=>{
        sql = "INSERT INTO alteracoes (vendedor_id,produto_id,data,tipo) VALUES (?,?,?,?);"
        let date = new Date()
        let data = date.toISOString().slice(0, 19).replace('T', ' ');
        valores=[0,produto[0].id,data,"Inseriu Produto"];
        connection.query(sql,valores, (error)=>{                  
          if(error)throw error;
        }) 
      })
    }
  })
}
  //variavel com mensagem para exibir na página
 global.addProd = "Produto Adicionado com Sucesso";
 //redireciona para a ultima página
res.redirect("back");
});


//Editar produto
app.post("/editProdutos", upload.single('imgProdEdit'), (req,res,next)=>{
  //verifica se editou a foto do produto 
  if(req.file){
     //Seleciona a foto anterior do produto
     connection.query("SELECT foto FROM produtos WHERE id = ?",[req.body.editProdId],(error,result)=>{
      if (error) throw error;
      if(result[0].foto != ""){
        let foto = __dirname+"/public/images/produtos/"+result[0].foto
        //Apaga a foto antiga do produto
        fs.unlink(foto,(error)=>{
          if(error) throw error;
        })
      }
    });
    //Faz a query para atualizar o produto com os valores introduzidos
    let sql = "UPDATE produtos SET nome = ?, descricao = ?, preco = ? , subcategoria_id = ? , foto = ?, quantidade = ? , desconto = ? WHERE id = ?";
    let valores = [req.body.eNomeProd,req.body.descProd,req.body.precoProd,req.body.subcatProd,req.file.filename,req.body.quantProd,req.body.descontoProd,req.body.editProdId];
    connection.query(sql,valores,(error)=>{
      if (error) throw error;
    })
  }else{
    //Faz a query para atualizar o produto com os valores introduzidos sem a foto
    let sql = "UPDATE produtos SET nome = ?, descricao = ?, preco = ? , subcategoria_id = ? , quantidade = ? , desconto = ?  WHERE id = ?";
    let valores = [req.body.eNomeProd,req.body.descProd,req.body.precoProd,req.body.subcatProd,req.body.quantProd,req.body.descontoProd,req.body.editProdId];
    connection.query(sql,valores,(error)=>{
      if (error) throw error;
    })
  }
 //Seleciona o id de vendedor 
  connection.query("SELECT id FROM vendedores WHERE user_id = ?;",[req.session.userid],(error,result)=>{
    if(error)throw error;
    sql = "INSERT INTO alteracoes (vendedor_id,produto_id,data,tipo) VALUES (?,?,?,?);"
    // cria uma variavel com a data no formato YYYY/MM/DD HH:MM:SS
    let date = new Date()
    let data = date.toISOString().slice(0, 19).replace('T', ' ');
    //verifica se foi o vendedor a alterar o produto
    if(result.length>0){
      //faz a query com o id de vendedor
    valores=[result[0].id,req.body.editProdId,data,"Editou Produto"];
    connection.query(sql,valores, (error)=>{
      if(error)throw error;
    })
  }else{
    //faz a query com 0 se foi o dono da empresa
    valores=[0,req.body.editProdId,data,"Editou Produto"];
    connection.query(sql,valores, (error)=>{
      if(error)throw error;
    })
  }
  });
  //redireciona para a ultima página
  res.redirect("back")
  });

  //Remover promoção do produto
  app.get("/rmvPromo=:id",(req,res)=>{
    //Seleciona o id de vendedor
    connection.query("SELECT id FROM vendedores WHERE user_id = ?;",[req.session.userid],(error,result)=>{
      if(error)throw error;
      sql = "INSERT INTO alteracoes (vendedor_id,produto_id,data,tipo) VALUES (?,?,?,?);"
      let date = new Date()
      let data = date.toISOString().slice(0, 19).replace('T', ' ');
      if(result.length>0){
        //Se é vendedor faz a query com o id de vendedor
      valores=[result[0].id,req.params.id,data,"Removeu Promo"];
      connection.query(sql,valores, (error)=>{
        if(error)throw error;
      })
    }else{
      //Se é dono da empresa faz a query com 0
      valores=[0,req.params.id,data,"Removeu Promo"];
      connection.query(sql,valores, (error)=>{
        if(error)throw error;
      })
    }
    //Atualiza a promoção para 0
      sql = "UPDATE produtos SET desconto = ? WHERE id = ?";
      valores = [0,req.params.id]
      connection.query(sql,valores,(error)=>{
        if (error) throw error;
      })
    });
    res.redirect("back");
  });

  //edita o estado do vendedor (dono empresa)
  app.get("/rmvVendedor=:id",(req,res)=>{
      //query para atualizar o estado do vendedor para 0
       let sql = "UPDATE vendedores SET estado = ? WHERE id = ? ;";
      let valores = [0,req.params.id];
      connection.query(sql,valores,(error)=>{
        if (error) throw error;
      }); 
      //redireciona para a ultima página
      res.redirect("back");
  });

  //Remover utilizador
  app.get("/rmvUser=:id",(req,res)=>{
    //query para alterar o estado do utilizador selecionado para 0
    let sql = "UPDATE utilizadores SET estado = 0 WHERE id = ?;";
    let valores = [req.params.id];
    connection.query(sql,valores,(error)=>{
      if (error) throw error;
    })
    res.redirect("back");
  })

//faz uma encomenda
  app.post("/encomenda",(req,res)=>{
    //atribui as variaveis com os valores do formulario
    let produtos = JSON.parse(req.body.encProd)
    let quantidades = JSON.parse(req.body.encQuant)
    let date = new Date()
    let data = date.toISOString().slice(0, 19).replace('T', ' ');
    let notas = req.body.notas || "";
    var estado = req.body.estado;
    let totalEnc = req.body.totalEnc
    let morada = req.body.rua

    //Query para inserir a encomenda
    let sql = "INSERT INTO encomendas (user_id,data,nota,estado,total,destino) VALUES (?,?,?,?,?,?)";
    let valores = [req.session.userid,data,notas,estado,totalEnc,morada];
    connection.query(sql,valores,(error)=>{
      if (error) throw error;
    })
    //Pega o id da encomenda acabada de inserir
    connection.query("SELECT id FROM encomendas ORDER BY id DESC LIMIT 1;",(error,result)=>{
      //Registar cada produto por encomenda
      for (let i = 0;i<produtos.length;i++){
        sql = "INSERT INTO prodenc (produto_id,quantidade,encomenda_id,total,estado,enviado) VALUES (?,?,?,?,?,?);"
        let totalProd;
        //verifica se o produto está em promoção para calcular o total do produto na encomenda
        if (produtos[i].desconto>0){
          totalProd = (produtos[i].preco - produtos[i].preco * (produtos[i].desconto /100))*quantidades[i].quantidade
        }else{
          totalProd = produtos[i].preco * quantidades[i].quantidade
        }
        //faz a query para inserir cada produto por encomenda
        valores = [produtos[i].id,quantidades[i].quantidade,result[0].id,totalProd,0,0]
        connection.query(sql,valores,(error)=>{
          if (error) throw error;
        })
        //Após fazer a encomenda apaga os produtos do carrinho
        sql = "DELETE FROM prodcar WHERE produto_id = ? AND carrinho_id = ?"
        valores=[produtos[i].id,req.session.carrinho];
        //atribui o valor 0 ao numero de produtos 
        global.nrprod = 0
        connection.query(sql,valores,(error)=>{
          if (error)throw error;
          //tira a quantidade encomendada ao stock dos produtos
          connection.query("UPDATE produtos SET quantidade = quantidade - ? WHERE id = ? ",[quantidades[i].quantidade,produtos[i].id],(error)=>{
            if (error) throw error;
          })
        })
      }
      //Envia email a informar a encomenda
      if(estado == "Pendente"){
        emailEncomenda(req.session.email,"Encomenda Nº "+result[0].id,estado,produtos,quantidades,totalEnc,"PT50 0000 0000 00000000000 00");
      }else{
        emailEncomenda(req.session.email,"Encomenda Nº "+result[0].id,estado,produtos,quantidades,totalEnc,"");
      }
      
    });
    //redireciona o utilizador para a ultima página
    res.redirect("back")
  });

  //alterar estados da encomenda
  app.get("/enviarEnc/:id/:emp",(req,res)=>{~
    //Lista de encomendas com o email de quem realizou
    connection.query("SELECT encomendas.id, utilizadores.email FROM encomendas JOIN utilizadores ON encomendas.user_id = utilizadores.id;",(error,encomendas)=>{
      if (error) throw error;
      //Seleciona as encomendas
      connection.query("SELECT * FROM encomendas",(error,estado)=>{
        if(error) throw error;
        let sql;
        let valores;
        //seleciona o email de quem fez a encomenda selecionada
        for(let i = 0;i<encomendas.length;i++){
          if(estado[i].id == req.params.id){
            connection.query("SELECT email from utilizadores WHERE id= ?",[estado[i].user_id],(error,email)=>{
              if(error) throw error;
              //Conforme o estado da encomenda, muda as querys
              switch (estado[i].estado){
                //query para atualizar o estado da encomenda para aceite
                case "Pendente" : sql = "UPDATE encomendas SET estado = 'Aceite' WHERE id = ?;";
                                  valores = [req.params.id];
                                  connection.query(sql,valores,(error)=>{
                                    if (error) throw error;
                                  });
                                  //envia email com o estado da encomenda
                                 estadoEncomenda(email[0].email,"Estado da Encomenda",estado[i].id+" - Aceite");
                                  res.redirect("back");
                break;
                //query para atualizar o estado da encomenda para Enviado
                case "Aceite" :   //Atualiza o estado dos produtos da empresa especifica para enviado
                                 connection.query("SELECT * FROM prodenc WHERE encomenda_id = ? ",[req.params.id],(error,prodenc)=>{
                                  if (error) throw error;
                                  connection.query("SELECT * FROM produtos WHERE empresa_id = ?",[req.params.emp],(error,produtos)=>{
                                    if (error) throw error;
                                    for(let i = 0;i<prodenc.length;i++){
                                      for(let j = 0;j<produtos.length;j++){
                                        if (prodenc[i].produto_id == produtos[j].id && produtos[j].empresa_id == req.params.emp){
                                          sql = "UPDATE prodenc SET enviado = 1 WHERE id = ? ;";
                                          valores = [prodenc[i].id];
                                          connection.query(sql,valores,(error)=>{
                                            if (error) throw error;
                                          })
                                        }
                                      }
                                    }
                                          //Seleciona os produtos por encomenda da encomenda selecionada
                                    connection.query("SELECT * FROM prodenc WHERE encomenda_id = ? AND enviado = 0",[req.params.id],(error,result)=>{
                                      console.log(result)
                                      if (error) throw error;
                                      if(result.length>0){
                                        res.redirect("back");
                                      }else{
                                        sql = "UPDATE encomendas SET estado = 'Enviado' WHERE id = ?;";
                                        valores = [req.params.id];
                                        connection.query(sql,valores,(error)=>{
                                          if (error) throw error;
                                        });
                                        //envia email com o estado da encomenda
                                        estadoEncomenda(email[0].email,"Estado da Encomenda",estado[i].id+" - Enviada");
                                        res.redirect("back")
                                  }
                                })     
                                  })
                                        
                                });
                                  
                break;
                //query para atualizar o estado da encomenda para Em Entrega
                case "Enviado" : sql = "UPDATE encomendas SET estado = 'Em Entrega' WHERE id = ?;";
                                valores = [req.params.id];
                                connection.query(sql,valores,(error)=>{
                                  if (error) throw error;
                                });
                                 //envia email com o estado da encomenda
                                estadoEncomenda(email[0].email,"Estado da Encomenda",estado[i].id+" - Em Entrega");
                                res.redirect("back");
                break;
                 //query para atualizar o estado da encomenda para Entregue
                case "Em Entrega":sql = "UPDATE encomendas SET estado = 'Entregue' WHERE id = ?;";
                      valores = [req.params.id];
                      connection.query(sql,valores,(error)=>{
                        if (error) throw error;
                      });
                       //envia email com o estado da encomenda
                      estadoEncomenda(email[0].email,"Estado da Encomenda",estado[i].id+" - Entregue");
                      res.redirect("back");
                break;
                //Caso não seja nenhum dos ultimos estados redireciona para a ultima página
                default : res.redirect("back");break;
            }
            })
          }
        }
      })
    })
  })


//inicia o servidor numa porta especifica
app.listen(process.env.PORT, () => {
  //envia para a consola uma mensagem com a porta
  console.log(`Ligado na porta : ${process.env.PORT}`);
});