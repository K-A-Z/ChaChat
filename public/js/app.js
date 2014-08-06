 var app = angular.module('chatApp', ['ngRoute']);

app.config(function($routeProvider){
    $routeProvider
        .when('/',{
            controller:'LoginController',
            templateUrl:'page/login.html'
        })
        .when('/room/:room/',{
            controller:'ChatController',
            templateUrl:'page/room.html'
        })
        .otherwise({
            redirectTo: '/'
        });
});

app.run(function($rootScope, $location, $route, AuthService){
    $rootScope.$on('$routeChangeStart',function(ev, next, current){
        if(next.controller == 'LoginController')
        {
            if (AuthService.isLogged())
            {
                $location.path('/');
                $route.reload();
            }
        }
        else
        {
            if (AuthService.isLogged() == false)
            {
                $location.path('/');
                $route.reload();
            }
        }
    });
});

app.controller('LoginController', function($scope, $location, socket, AuthService){
    $scope.login = function(){
        $scope.disabled = true;
        AuthService.login($scope.username, $scope.password)
            .then(function(){
                socket.emit('login',$scope.username);
                $location.path('/room/lobby');
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

app.controller('ChatController', function($scope,$location,$anchorScroll,socket,AuthService,$routeParams) {
    console.log($routeParams.room);
    if ($routeParams.room != null){
        socket.emit('join room',$routeParams.room);
    }
    $scope.messages = [
      {text:'Welcome to ChaChat!\r\nEnjoy!', speaker:'other', user:'system', time:'10min'}];

     $scope.sendMessage = function() {
         var msgJson = JSON.stringify({
             text:$scope.newMessage,
             user:AuthService.getUser().username,
             room:$routeParams.room,
             time:new Date()
         });
         socket.emit('new message',msgJson);
         $scope.newMessage='';
         console.log(AuthService.getUser());
            
    };
    socket.on('new message', function (message) {
        var msg = JSON.parse(message);
        var getspk = function(){
            if (msg.user==AuthService.getUser().username){
                return 'self';
            }else{
                return 'other';
            };
        };
        if (msg.room == $routeParams.room){
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
});

app.controller('RoomController', function($scope, socket, AuthService, $location){
    $scope.rooms=[];
    $scope.$on('$routeChangeStart',function(){
        console.log('routeChangeStart called');
        $scope.sidebar = AuthService.isLogged();
    });
    $scope.changeRoom = function(room){
        console.log('room chaged');
        $location.path('/room/discussion');
    }
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
});

app.factory('AuthService',function($q,$timeout){
    var _user = null;
    return{
        isLogged: function(){return !! _user;},
        getUser: function(){ return _user;},
        login: function(username, password){
            var deferred = $q.defer();
            $timeout(function(){
                if(username == password)
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


