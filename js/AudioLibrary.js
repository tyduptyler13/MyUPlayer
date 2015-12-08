/**
 * Please be aware that this code has global variables.
 * I coded it before I knew about better methods of global like
 * variables in classes and it is too late to change this fact.
 * If you want to use this in your site, it is ideal to avoid
 * using the variables below or change them so they don't cause
 * trouble with your own code. This might be fixed in a future
 * version where a full rewrite would be easier than just changing
 * the code below.
 */

var stats, camera, renderer, scene, mouseX = 0, mouseY = 0;
var windowHalfX = window.innerWidth/2;
var windowHalfY = window.innerHeight/2;
var blocks;
var updateList = function(){return null};
var context = new AudioContext();//Only one can be created so make it global.
var audioSystem;
var spacing = 1, xlimit=8, zlimit=8, size=10;//Settings
var redLow=0, redRange=1, blueLow=1, blueRange=-1, greenLow=0, greenRange=0;
var stop = true;
var renderLoop;

function init(){

	/* SoundCloud Setup */
    SC.initialize({
        client_id: '33a4107f84f58822c07c3d80146f04b1'
    });
    var typingTimer;
    var doneTypingInterval = 2000; //2 Seconds.
    var search = function(){
        $('#songs').text("Searching...");
        SC.get('/tracks', {q: $('#songSearch').val() }, function(tracks) {
            var songs = $('#songs');
            songs.html("<ol></ol>");
            var list = songs.find('ol');
            $.each(tracks, function(index, value){
                if (value.streamable != true)
                    return;
                list.append('<li><a href="' + value.permalink_url + '">'
                        + value.title + '</a> - <a class="playable" href="'
                        + value.stream_url + '">Play</a></li>');
            });
        });
    };
    $('#songSearch').keyup(function(){
        clearTimeout(typingTimer);
        typingTimer = setTimeout(search, doneTypingInterval);
    }).keydown(function(){
        clearTimeout(typingTimer);
    });
    
    /* Visualizer class */
    audioSystem = new AudioLib();
	/* Audio setup */
	$('#songs').on('click', 'a.playable', function(e){
		e.preventDefault();
		audioSystem.loadSong($(this).attr('href') + '?client_id=33a4107f84f58822c07c3d80146f04b1');
		audioSystem.audio.play();
		$('#songs a').removeClass('active');
		$(this).addClass('active');
		$('#player *').remove();
		$('#player').append(audioSystem.audio);
		audioSystem.audio.controls = 'controls';
		$('#player').fadeIn();
	});
	$('.controls #play').click(function(){audioSystem.play()});
	$('.controls #pause').click(function(){audioSystem.pause()});
	
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	stats.domElement.style.zIndex = 100;
	$('body').append(stats.domElement);
	
	setup();
	
	$('#settingsToggle').click(function(){$('#settings').toggle()});
	$('#dimToggle').click(function(){
		var player = $('.player');
		if (player.css('opacity')==1){
			player.fadeTo('slow',.1);
		}else{
			player.fadeTo('fast',1);
		}
	});
	$('#save').click(saveSettings);
	$(window).resize(docResize);

}

function saveSettings(){
    if (audioSystem.analyser)
	    audioSystem.analyser.smoothingTimeConstant = parseFloat($('#smoothing').val());
	var high = getRGB($('#colorHigh').val().substr(1));
	var low  = getRGB($('#colorLow').val().substr(1));
	redLow = low[0];
	redRange = high[0]-low[0];
	greenLow = low[1];
	greenRange = high[1]-low[1];
	blueLow = low[2];
	blueRange = high[2]-low[2];
    
    var x = $('#cubeX').val();
    var z = $('#cubeZ').val();
    var sp = $('#space').val();
    var si = $('#size').val();

    if (x != xlimit || z != zlimit || sp != spacing || si != size){
        cancelAnimationFrame(renderLoop);
        xlimit = x;
        zlimit = z;
        spacing = sp;
        size = si;
        setup();
    }

}

function setup(){
	$('canvas').remove();
	/* Visual Setup */
	camera = new THREE.PerspectiveCamera(40,window.innerWidth/window.innerHeight,1,5000);
	camera.position.z = 300;

	scene = new THREE.Scene();
	scene.add(camera);
	
	//This does not need to change over time so a single instance is ok.
	var wire  = new THREE.MeshBasicMaterial({color: 0xffff00, wireframe: true, wireframeLinewidth: 1});
	
	count = xlimit*zlimit;
	blocks = new Array(xlimit);
	for (var x=0; x<xlimit; ++x){//Change the limit to change the array.
		blocks[x] = new Array(zlimit);
		for (var z=0;z < zlimit; ++z){
			//These get edited during the render. Multiple instances are required.
			var geo   = new THREE.BoxGeometry(10, 1, 10, 1, 1, 1); 
			var solid = new THREE.MeshBasicMaterial({color: 0x00ff00});

			var mesh  = new THREE.SceneUtils.createMultiMaterialObject(geo,[wire,solid]);
			mesh.position.x = x*size+(spacing*x)-xlimit*size/2;
			mesh.position.z = z*size+(spacing*z)-zlimit*size/2;
			mesh.position.y = 0;
			scene.add(mesh);
			blocks[x][z]=mesh;
		}
	}

	//var light = new THREE.
	
	scene.matrixAutoUpdate = false;
	
	renderer = new THREE.WebGLRenderer({antialias:true});
	renderer.setSize(window.innerWidth,window.innerHeight);
	$('body').append(renderer.domElement);
 
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.damping = 0.2;

    animate();
}


function docResize(){
	windowHalfX = window.innerWidth/2;
	windowHalfY = window.innerHeight/2;
	
	camera.aspect = window.innerWidth/window.innerHeight;
	camera.updateProjectionMatrix();
	
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(){
    renderLoop = requestAnimationFrame(animate);
	update();
	render();
}

function update(){
	//Stats
	stats.update();
	
	//Sound fetch
	var array = updateList();
	if (array!=null){
		var smooth = array.length/(xlimit*zlimit);
		
        var level = 0;
        var normalLevel = 0;

        var x = y = z = 0;

		for(x = 0; x < blocks.length; ++x){
			for(y = 0; y < blocks[x].length; ++y){
				level = 0;
				for(z = 0; z < smooth; z++){
					level+=array[Math.round(smooth * (x+1) * (y+1))];
				}
				level/=smooth;
				normalLevel = level/255;
				level=(level<=1)?1:level;
				blocks[x][y].scale.setY(level);
				blocks[x][y].children[1].material.color.r = redLow + redRange * normalLevel;
				blocks[x][y].children[1].material.color.g = greenLow + greenRange * normalLevel;
				blocks[x][y].children[1].material.color.b = blueLow + blueRange * normalLevel;
			}
		}
	}
	
}

function render(){
	renderer.render(scene,camera);
}

AudioLib = function(){
	//Create global object since only one is allowed.
	this.context = (typeof context == "AudioContext")? context : context = new AudioContext();
	this.analyser = null;
	this.sourceNode = null;
	this.audio = null;
}
AudioLib.prototype.constructor = AudioLib;
AudioLib.prototype.loadSong = function(url){
	if (this.audio) this.audio.remove();
	if (this.sourceNode) this.sourceNode.disconnect();
	this.audio = new Audio();
	this.audio.crossOrigin = 'anonymous';
	this.audio.src = url;
	$(this.audio).bind('canplay',this,this.setupAudioNodes);
}
AudioLib.prototype.setupAudioNodes = function(e){
	var local = (typeof this == "AudioLib")?this:e.data;
	local.analyser = (local.analyser || local.context.createAnalyser());
	local.analyser.smoothingTimeConstant = 0.8;
	local.analyser.fftSize = Math.pow(2, Math.ceil( Math.log2( xlimit * zlimit * 2 )));
    //The function above finds the nearest power of 2 for the number of elements. (Ceil)
	
	local.sourceNode = local.context.createMediaElementSource(local.audio);
	local.sourceNode.connect(local.analyser);
	local.sourceNode.connect(local.context.destination);

    var array = new Uint8Array(local.analyser.frequencyBinCount);

	updateList = function(){
        local.analyser.getByteFrequencyData(array);
		
		return array;
	}
}

function getRGB(hexStr){
	var hex = parseInt(hexStr, 16);
	var color = new THREE.Color(hex);
	return [color.r, color.g, color.b];
}

$(init);
