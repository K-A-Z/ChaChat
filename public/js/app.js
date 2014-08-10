var app = angular.module('chatApp', ['ngRoute']);

app.config(function($routeProvider){
    $routeProvider
        .when('/',{
            controller:'LoginController',
            templateUrl:'page/login.html'
        })
        .when('/room',{
            controller:'ChatController',
            templateUrl:'page/room.html'
        })
        .otherwise({
            redirectTo: '/'
        });
});

app.run(function($rootScope, $location, $route, AuthService,RoomService){
    $rootScope.$on('$routeChangeStart',function(ev, next, current){
        if(next.controller === 'LoginController')
        {
            if (AuthService.isLogged())
            {
                $location.path('/room');
                $route.reload();
            }
        }
        else
        {
            if (AuthService.isLogged() === false)
            {
                $location.path('/');
                $route.reload();
            }
        }
    });
});

app.controller('LoginController', function($scope, $location, socket, AuthService, $rootScope){
    $scope.login = function(){
        $scope.disabled = true;
        AuthService.login($scope.username, $scope.password)
            .then(function(){
                socket.emit('login',$scope.username);
                $location.path('/room');
            })
            .catch(function(){
                $scope.alert = {msg:"Login failed"};
            })
            .finally(function(){
                $scope.username = "";
                $scope.password = "";
                $scope.disabled = false;
            });
    };
});

app.controller('ChatController', function($scope,$location,$anchorScroll,socket,AuthService,RoomService) {
    console.log('chat controller');
//    var activeRoom=null;
//    console.log('active room is '+activeRoom);
    $scope.messages = [
        {text:'Welcome to ChaChat!\r\nEnjoy!', speaker:'other', user:'system', time:'10min'},
        {text:RoomService.getActiveRoom(), speaker:'other', user:'room notificator', time:'10min'},
    ];

     $scope.sendMessage = function() {
         var msgJson = JSON.stringify({
             text:$scope.newMessage,
             user:AuthService.getUser().username,
             room:RoomService.getActiveRoom(),
             time:new Date()
         });
         socket.emit('new message',msgJson);
         $scope.newMessage='';
         console.log(AuthService.getUser());
         console.log(RoomService.getActiveRoom());
    };
    socket.on('new message', function (message) {
        var msg = JSON.parse(message);
        var getspk = function(){
            if (msg.user===AuthService.getUser().username){
                return 'self';
            }else{
                return 'other';
            }
        };
        if (msg.room === RoomService.getActiveRoom()){
            $scope.messages.push({
                text: msg.text,
                speaker:getspk(),
                user:msg.user,
                time:new Date()
            });
        }else{
            console.log('client recived a message of inactive room');
        }
        $location.hash('bottom');
        $anchorScroll();
    });
    
    $scope.$on('room change', function(event,message){
        console.log('recived room change');
        console.log(message);
        if(message != ""){
            console.log($scope.messages.length);
            $scope.messages=[];
            for (var i =0 ; i < $scope.messages.length ; i++){
                console.log($scope.messages[i]);
                $scope.messages[i].text='modified';
                console.log($scope.messages[i]);

            }   
            socket.emit('join room',message);
            activeRoom = message;
        }
    });
});

app.controller('RoomController', function($scope, socket, AuthService, $location,RoomService){
    $scope.newroom=false;
    $scope.rooms=[];
    socket.emit('room list');
    $scope.changeRoom = function(room){
        console.log('room chaged');
        console.log(room);
        $scope.$emit('room change',room);
        RoomService.setActiveRoom(room);
    };
    socket.on('room list',function(message){
        console.log('room list recived');
        console.log(message);
        var rooms = JSON.parse(message);
        for (var i = 0 ; i < rooms.length ; i++){
            $scope.rooms.push({
                name:rooms[i]
            });
        }
    });
    socket.on('add room',function(message){
        console.log('add room recived');
        console.log(message);
        $scope.rooms.push({
            name:message
        });
    });
    $scope.createRoom = function(){
        socket.emit('create room',$scope.roomName);
        $scope.roomName = "";
        $scope.newroom = false;
    };
    $scope.cancel = function(){
        $scope.roomName = "";
        $scope.newroom = false;
    };
        
});



app.factory('RoomService',function(){
    var activeRoom = 'lobby';
    return{
        getActiveRoom: function(){return activeRoom;},
        setActiveRoom: function(room){activeRoom = room;}
        
    };
    
});

app.factory('AuthService',function($q,$timeout){
    var _user = null;
    return{
        isLogged: function(){return !! _user;},
        getUser: function(){ return _user;},
        login: function(username, password){
            var deferred = $q.defer();
            $timeout(function(){
                if(username === password)
                {
                    _user = {username:username};
                     deferred.resolve();
                }
                else
                {
                    deferred.reject();
                }
            },500);
            return deferred.promise;
        },
        logout:function(){
                _user = null;
                return $q.all();
        }
    };
});

app.factory('socket', function ($rootScope) {
  var socket = io();
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  };
});


