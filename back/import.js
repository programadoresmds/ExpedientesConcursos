var fs = require("fs");
var csv = require("fast-csv");
var _ = require("./underscore-min");
var mongodb = require('mongodb');

var uri = 'mongodb://127.0.0.1/ExpedientesConcurso';

//process.on('uncaughtException', function (err) {
//  	console.log('Tiró error: ', err.toString());
//});

mongodb.MongoClient.connect(uri, function(err, db) {  
  	if(err) throw err;
	var stream_perfiles = fs.createReadStream("perfiles.csv", {encoding: "utf8"});
	csv.fromStream(stream_perfiles, {headers : true})
		.on("data", function(data){     
			db.collection('perfiles').update({codigo: data.Perfil}, {
				codigo: data.Perfil ,
				descripcion: data.DescrPerfil,
				nivel: data.Nivel,
				agrupamiento: data.Agrupamiento,
				convocatoria: data.Convocatoria,
				comite: data.Comite,
				vacantes: data.Vacantes					
			}, {
				upsert: true
			}, function(err){
				if(err) console.log("error al importar perfil", err);
			});			
		})
		.on("end", function(){
			console.log(JSON.stringify("termino de cargar perfiles"));
		});	
	
	var stream_documentos = fs.createReadStream("documentos.csv", {encoding: "utf8"});
	csv
		.fromStream(stream_documentos, {headers : true})
		.on("data", function(data){     
			db.collection('documentos').update({codigo: data.Codigo}, {
				codigo: data.Codigo ,
				descripcion: data.Documento
			}, {
				upsert: true
			}, function(err){
				if(err) console.log("error al importar documento", err);
			});			
		})
		.on("end", function(){
			console.log(JSON.stringify("termino de cargar documentos"));
		});	
	
	var stream_checklist_cabecera = fs.createReadStream("checklist_cabecera.csv", {encoding: "utf8"});
	csv
		.fromStream(stream_checklist_cabecera, {headers : true})
		.on("data", function(data){     
			db.collection('checklists').update({codigo: data.Codigo}, {
				$set: {
					codigo: data.Codigo ,
					checklist: data.Checklist
				}
			}, {
				upsert: true
			}, function(err){
				if(err) console.log("error al importar checklist_cabecera", err);
			});			
		})
		.on("end", function(){
			console.log(JSON.stringify("termino de cargar checklist_cabecera"));
			//cuando estan todos los checklists cargados, cargo la documentacion requerida
			var col_checklists = db.collection('checklists');
			col_checklists.find({}).toArray(function(err, checklists){
				_.forEach(checklists, function(ch){
					ch.documentacionRequerida = [];
				})
				var stream_checklist_detalle = fs.createReadStream("checklist_detalle.csv", {encoding: "utf8"});
				csv
					.fromStream(stream_checklist_detalle, {headers : true})
					.on("data", function(data){     
						var checklist = _.findWhere(checklists, {codigo: data.Checklist});
						checklist.documentacionRequerida.push({
							codigo: data.Documento,
							orden: data.Orden
						});	
					})
					.on("end", function(){
						_.forEach(checklists, function(ch){
							col_checklists.save(ch, function(){});
						})
						console.log(JSON.stringify("termino de cargar checklist_detalle"));
					});	
			});			
		});	
	
	
	var stream_inscriptos = fs.createReadStream("inscriptos.csv", {encoding: "utf8"});
	csv
		.fromStream(stream_inscriptos, {headers : true})
		.on("data", function(data){     
			db.collection('postulantes').update({dni: data.Nro_Doc}, {
				$set: {
					dni: data.Nro_Doc ,
					apellido: data.Apellido,
					nombre: data.Nombre,
					mail: data.Mail
				}
			}, {
				upsert: true
			}, function(err){
				if(err) console.log("error al importar checklist_cabecera", err);
			});			
		})
		.on("end", function(){
			console.log(JSON.stringify("termino de cargar postulantes"));
			//cuando estan todos los postulantes cargados, cargo las postulaciones
			var col_postulantes = db.collection('postulantes');
			col_postulantes.find({}).toArray(function(err, postulantes){
				_.forEach(postulantes, function(p){
					if(!p.postulaciones) p.postulaciones = [];
				})
				var stream_postulaciones = fs.createReadStream("postulaciones.csv", {encoding: "utf8"});
				csv
					.fromStream(stream_postulaciones, {headers : true})
					.on("data", function(data){     
						var postulante = _.findWhere(postulantes, {dni: data.DNI});
						var postulacion = _.findWhere(postulante.postulaciones, {codigoPerfil: data.Cod_Perfil});
						if(!postulacion) {
							postulacion = {
								codigoPerfil: data.Cod_Perfil,
								documentacionPresentada: []
							};
							postulante.postulaciones.push(postulacion);	
						}
						postulacion.codigoChecklist = data.Cod_Checklist;						
					})
					.on("end", function(){
						_.forEach(postulantes, function(p){
							col_postulantes.save(p, function(){});
						})
						console.log(JSON.stringify("termino de cargar postulaciones"));
					});	
			});			
		});	
	
});



