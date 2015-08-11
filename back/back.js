
var express = require('express');
var http = require('http');
var mongodb = require('mongodb');
var _ = require("./underscore-min");
var serveStatic = require('serve-static')
var GoogleSpreadsheet = require("google-spreadsheet"); 
var fs = require("fs");
var csv = require("fast-csv");

var ObjectId = mongodb.ObjectID;

var uri_mongo = 'mongodb://127.0.0.1/ExpedientesConcurso';
var app = express();

app.use(serveStatic('../front', {'index': ['RecepcionYFoliado.html']}))

process.on('uncaughtException', function (err) {
  	console.log('Tiró error: ', err.toString());
});

mongodb.MongoClient.connect(uri_mongo, function(err, db) {  
  	if(err) throw err;
	
	app.get('/getPostulantePorDni/:dni', function(request, response){
		var dni = request.params.dni.toString();
		
		db.collection('postulantes').findOne({"dni": dni}, function(err, postulante){		
			if(postulante == null) {
				response.send(JSON.stringify({encontrado:false}));
				return;
			}			
			response.send(JSON.stringify(postulante));
		});	
	});	
	
	
	app.get('/getPerfilPorCodigo/:codigo', function(request, response){
		var codigo = request.params.codigo;
		
		db.collection('perfiles').findOne({"codigo": codigo}, function(err, perfil){		
			if(perfil == null) {
				response.send(JSON.stringify({encontrado:false}));
				return;
			}			
			response.send(JSON.stringify(perfil));
		});	
	});	
	
	app.get('/getChecklistPorCodigo/:codigo', function(request, response){
		var codigo = request.params.codigo;
		
		db.collection('checklists').findOne({"codigo": codigo}, function(err, checklist){		
			if(checklist == null) {
				response.send(JSON.stringify({encontrado:false}));
				return;
			}			
			response.send(JSON.stringify(checklist));
		});	
	});		
	
	app.get('/getDocumentoPorCodigo/:codigo', function(request, response){
		var codigo = request.params.codigo;
		
		db.collection('documentos').findOne({"codigo": codigo}, function(err, documento){		
			if(documento == null) {
				response.send(JSON.stringify({encontrado:false}));
				return;
			}			
			response.send(JSON.stringify(documento));
		});	
	});	
	
	app.post('/guardarPostulante', function(request, response){
		var postulante = request.body.postulante;
		delete postulante._id;
		db.collection('postulantes').update({dni:postulante.dni}, postulante, function(err){
			if(err) throw err;
			response.send("ok");	
		});
	});	
	
	app.post('/crearExpediente', function(request, response){
		var numero_expediente = request.body.numero;
		
		db.collection('expedientes').save({numero: numero_expediente}, function(){
			if(err) throw err;
			response.send("ok");
		});
	});
	
	app.post('/guardarFojasFijasEnExpediente', function(request, response){
		var expediente = request.body.expediente;
		delete expediente._id;
		db.collection('expedientes').update({numero: expediente.numero}, expediente,  function(err){
			if(err) throw err;
			response.send("ok");
		});
	});
	
	app.get('/todosLosExpedientes', function(request, response){
		var col_expedientes = db.collection('expedientes');
		col_expedientes.find({}).toArray(function(err, expedientes){
			response.send(JSON.stringify(expedientes));
		});	
	});
	
	app.get('/getExpedientePorId/:id', function(request, response){
		var id = request.params.id;
		var ObjectId = require('mongodb').ObjectID;
		db.collection('expedientes').findOne({"_id": new ObjectId(id)}, function(err, expediente){		
			if(expediente == null) {
				response.send(JSON.stringify({encontrado:false}));
				return;
			}			
			response.send(JSON.stringify(expediente));
		});	
	});
	
	app.get('/postulacionesDelExpediente/:numero', function(request, response){
		var postulaciones_respuesta = [];			
		var documentacion_presentada = [];
		var postul_ant = "";
		db.collection('postulantes').find({}).toArray(function(err, postulantes){		
			db.collection('perfiles').find({}).toArray(function(err, perfiles){
				db.collection('checklists').find({}).toArray(function(err, checklists){
					db.collection('documentos').find({}).toArray(function(err, documentos){
						_.forEach(postulantes, function(postulante){
							_.forEach(_.where(postulante.postulaciones, {incluidoEnExpediente:request.params.numero}), function(postulacion){
								var perfil = _.findWhere(perfiles, {codigo: postulacion.codigoPerfil});
								var checklist = _.findWhere(checklists, {codigo: postulacion.codigoChecklist});
								if(postul_ant != postulacion.codigo) {
									postul_ant = postulacion.codigo;
									documentacion_presentada = [];
									_.forEach(postulacion.documentacionPresentada, function(doc_presentada){
										var documento = _.findWhere(documentos, {codigo: doc_presentada.codigo});						
										var doc_requerido = _.findWhere(checklist.documentacionRequerida, {codigo: doc_presentada.codigo});	
										if(!documento || !doc_requerido) return;
										documentacion_presentada.push({
											descripcion: documento.descripcion,
											cantidadFojas: doc_presentada.cantidadFojas,
											orden: doc_requerido.orden
										})
									});
								}
								postulaciones_respuesta.push({
									fechaDeInclusionEnExpediente: postulacion.fechaDeInclusionEnExpediente,
									codigo: postulacion.codigo,
									postulante: {
										nombre: postulante.nombre,
										apellido: postulante.apellido,
										dni: postulante.dni
									},						
									perfil: {
										codigo: perfil.codigo,
										descripcion: perfil.descripcion,
										nivel: perfil.nivel,
										agrupamiento: perfil.agrupamiento,
										comite: perfil.comite,
										vacantes: perfil.vacantes
									},
									documentacionPresentada: documentacion_presentada
								});
							});
						});	
						response.send(JSON.stringify(postulaciones_respuesta));
					});
				});
			});
		});
	});
	
	app.post('/quitarPostulacionDeExpediente', function(request, response){
		var codigo_postulacion = request.body.codigo_postulacion;
		
		var col_postulantes = db.collection('postulantes');
		col_postulantes.findOne({ postulaciones: {$elemMatch: {codigo: codigo_postulacion}}}, function(err, postulante){
			var postulacion = _.findWhere(postulante.postulaciones, {codigo: codigo_postulacion});
			delete postulacion.incluidoEnExpediente;
			delete postulacion.fechaDeInclusionEnExpediente;
			
			col_postulantes.save(postulante, function(err){
				if(err) throw err;
				response.send("ok");	
			});
		});	
	});
	
	app.get('/todosLosPerfiles', function(request, response){
		var col_perfiles = db.collection('perfiles');
		col_perfiles.find({}).toArray(function(err, perfiles){
			response.send(JSON.stringify(perfiles));
		});	
	});
	
	app.get('/postulacionesDelPerfil/:codigo', function(request, response){		
		var postulaciones_respuesta = [];			
		db.collection('postulantes').find({}).toArray(function(err, postulantes){		
			db.collection('perfiles').find({}).toArray(function(err, perfiles){
				db.collection('checklists').find({}).toArray(function(err, checklists){
					_.forEach(postulantes, function(postulante){
						_.forEach(_.where(postulante.postulaciones, {codigoPerfil:request.params.codigo}), function(postulacion){
							var perfil = _.findWhere(perfiles, {codigo: postulacion.codigoPerfil});
							var checklist = _.findWhere(checklists, {codigo: postulacion.codigoChecklist});
							if(!checklist || !perfil) return;
							
							var presento_toda_la_documentacion = true;
							_.forEach(checklist.documentacionRequerida, function(doc_requerido){
								var doc_presentado = _.findWhere(postulacion.documentacionPresentada, {codigo: doc_requerido.codigo});
								if(doc_presentado!==undefined) 
									{if(doc_presentado.cantidadFojas == "") presento_toda_la_documentacion = false;
									}
								else 
									{presento_toda_la_documentacion = false;}
							});
							
							postulaciones_respuesta.push({
								postulante: {
									nombre: postulante.nombre,
									apellido: postulante.apellido,
									dni: postulante.dni
								},						
								perfil: {
									codigo: perfil.codigo,
									descripcion: perfil.descripcion
								},
								incluidoEnExpediente: postulacion.incluidoEnExpediente,
								codigo: postulacion.codigo,
								presentoTodaLaDocumentacion: presento_toda_la_documentacion
							});
						});
					});
					response.send(JSON.stringify(postulaciones_respuesta));
				});
			});				
		});	
	});
	
		
	app.post('/incluirPostulacionEnExpediente', function(request, response){
		var codigo_postulacion = request.body.codigo_postulacion;
		var numero_expediente = request.body.numero_expediente;
				
		var col_postulantes = db.collection('postulantes');
		col_postulantes.findOne({ postulaciones: {$elemMatch: {codigo: codigo_postulacion}}}, function(err, postulante){
			var postulacion = _.findWhere(postulante.postulaciones, {codigo:codigo_postulacion});
			postulacion.incluidoEnExpediente = numero_expediente;
			postulacion.fechaDeInclusionEnExpediente = new Date();
			
			col_postulantes.save(postulante, function(err){
				if(err) throw err;
				response.send("ok");	
			});
		});	
	});	
	
	//importacion exportacion al excel
	
	app.get('/exportar', function(request, response){
		var col_postulantes = db.collection('postulantes');
		col_postulantes.find({}).toArray(function(err, postulantes){
			var csvStream = csv.createWriteStream({headers: true, delimiter:';'}),
				writableStream = fs.createWriteStream("../front/documentacion_presentada.csv");

			writableStream.on("finish", function(){
			  	response.redirect("documentacion_presentada.csv");	
			});

			csvStream.pipe(writableStream);

			_.forEach(postulantes, function(postulante){
				_.forEach(postulante.postulaciones, function(postulacion){
					_.forEach(postulacion.documentacionPresentada, function(doc){
						csvStream.write({
							postulacion: postulacion.codigo, 
							documento: doc.codigo,
							fojas: doc.cantidadFojas
						});
					});	
				});									
			});	
			csvStream.end();	
		});	
	});
	
	app.get('/importar', function(request, response){
		var my_sheet = new GoogleSpreadsheet('1tsEs8wpgMtJ0pnt3Q96_ob4VoU34ej17w6gzPM7-QtQ');
		my_sheet.getRows(2, function(err, data_perfiles){
			if(err) console.log("error al abrir hoja de perfiles", err);
			_.forEach(data_perfiles, function(data){
				db.collection('perfiles').update({codigo: data.perfil}, {
					codigo: data.perfil ,
					descripcion: data.descrperfil,
					nivel: data.nivel,
					agrupamiento: data.agrupamiento,
					convocatoria: data.convocatoria,
					comite: data.comite,
					vacantes: data.vacantes					
				}, {
					upsert: true
				}, function(err){
					if(err) console.log("error al importar perfil", err);
				});	
			});
			console.log("importados perfiles");

			my_sheet.getRows(4, function(err, data_documentos){
				if(err) console.log("error al abrir hoja de documentos", err);
					_.forEach(data_documentos, function(data){
						db.collection('documentos').update({codigo: data.codigo}, {
						codigo: data.codigo ,
						descripcion: data.documento
					}, {
						upsert: true
					}, function(err){
						if(err) console.log("error al importar documento", err);
					});			
				});
				console.log("importados documentos");

				my_sheet.getRows(5, function(err, data_cabecera_checklists){
					if(err) console.log("error al abrir hoja de cabeceras de checklists", err);
					_.forEach(data_cabecera_checklists, function(data){
						db.collection('checklists').update({codigo: data.codigo}, {
							$set: {
								codigo: data.codigo ,
								checklist: data.checklist
							}
						}, {
							upsert: true
						}, function(err){
							if(err) console.log("error al importar checklist_cabecera", err);
						});			
					});
					console.log("importados cabeceras checklists");

					my_sheet.getRows(6, function(err, data_detalle_checklists){
						if(err) console.log("error al abrir hoja de detalle checklists", err);

						var col_checklists = db.collection('checklists');
						col_checklists.find({}).toArray(function(err, checklists){
							_.forEach(checklists, function(ch){
								ch.documentacionRequerida = [];
							})

							_.forEach(data_detalle_checklists, function(data){
								var checklist = _.findWhere(checklists, {codigo: data.checklist});
								checklist.documentacionRequerida.push({
									codigo: data.documento,
									orden: data.orden
								});							
							});

							_.forEach(checklists, function(ch){
								col_checklists.save(ch, function(){});
							})
							console.log("importado detalle checklists");

							my_sheet.getRows( 3, function(err, data_postulantes){
								if(err) console.log("error al abrir hoja de postulantes", err);

								_.forEach(data_postulantes, function(data){	
									db.collection('postulantes').update({dni: data.nrodoc}, {
										$set: {
											dni: data.nrodoc,
											apellido: data.apellido,
											nombre: data.nombre,
											mail: data.mail
										}
									}, {
										upsert: true
									}, function(err){
										if(err) console.log("error al importar postulantes", err);
									});	
								});	
								console.log("importados postulantes");								

								my_sheet.getRows( 7, function(err, data_postulaciones){
									if(err) console.log("error al abrir hoja de postulaciones", err);
									var col_postulantes = db.collection('postulantes');
									col_postulantes.find({}).toArray(function(err, postulantes){
										_.forEach(postulantes, function(p){
											if(!p.postulaciones) p.postulaciones = [];
										});
										_.forEach(data_postulaciones, function(data){	
											var postulante = _.findWhere(postulantes, {dni: data.dni});
											var postulacion = _.findWhere(postulante.postulaciones, {codigo: data.postulacion});
											if(!postulacion) {
												postulacion = {
													codigo: data.postulacion,
													documentacionPresentada: []
												};											
												postulante.postulaciones.push(postulacion);	
											}
											postulacion.codigoPerfil = data.codperfil;
											postulacion.codigoChecklist = data.codchecklist;		
										});	
										_.forEach(postulantes, function(p){
											col_postulantes.save(p, function(){});
										});
										console.log("importadas postulaciones");										
										
										response.send("ok, todo importado");
									});
								});						
							});	
						});	
					});				
				});				
			});		
		});		
	});	
});


var allowCrossDomain = function(req, res, next) {
        res.header('Access-Control-Allow-Origin', "*");
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
    }
app.use(allowCrossDomain);
var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

var server = http.createServer(app);
server.listen(3000, function() {
    console.log("Servidor levantado en el puerto 3000");
});  