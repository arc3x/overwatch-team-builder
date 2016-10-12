angular.module('app', [])
    .controller('overwatchDataController', ['$scope','$http', function($scope,$http) {

        $scope.playerCount = 0;

        $scope.team = {
            'players': []
        };

        $scope.showSuggested = false;

        $scope.compositions = [];   //[arco-1341, cRc-1211, ...]
        $scope.suggestedComp;
        $scope.roles = [];          //[tank, tank, dps, ...]
        $scope.tankCount = 2;
        $scope.dpsCount = 2;
        $scope.supportCount = 2;

        $scope.loading = false;
        $scope.loadingCount = 0;
        function loadingOn() {
            $scope.loadingCount += 1;
            $scope.loading=true
            console.log($scope.loadingCount);
        }
        function loadingOff() {
            $scope.loadingCount -= 1;
            if ($scope.loadingCount==0) {
                $scope.loading=false
            }
            console.log($scope.loadingCount);
        }

        $scope.add6Players = function() {
            $scope.addPlayer("arco#1341");
            $scope.addPlayer("cRc#1211");
            $scope.addPlayer("Murdock#11667");
            $scope.addPlayer("CrotalusX#1265");
            $scope.addPlayer("Dragnier#1375");
            $scope.addPlayer("Hexcyclone#1148");
        }

        $scope.removePlayer = function(battleTag) {
            console.log($scope.team);
            for (player in $scope.team.players) {
                if ($scope.team.players[player].battleTag==battleTag) {
                    delete $scope.team.players[player];
                    $scope.team.players = $scope.team.players.filter(function (item) { return item != undefined });
                    //$scope.team.players.length -= 1;
                    //$scope.team.players.splice(player+1,player);
                    $scope.playerCount -= 1;
                    console.log($scope.team);
                    return;
                }
            }
            //$scope.$apply();
        }


        $scope.addPlayer = function(battleTag) {
            loadingOn();
            // get api data
            $http({
                method: 'GET',
                url: "https://owapi.net/api/v3/u/"+battleTag.replace("#", "-")+"/heroes"
            }).then(function successCallback(response) {
                // this callback will be called asynchronously
                // when the response is available

                // error if team already has 6 players
                if ($scope.playerCount == 6) {
                    loadingOff();
                    alert("6 players already on team");
                    return;
                }
                console.log(response.data);
                // get hero data; error if none
                let heroes = {};
                if (response.data.eu) {
                    heroes = response.data.eu.heroes;
                } else if (response.data.kr) {
                    heroes = response.data.kr.heroes;
                } else if (response.data.us) {
                    heroes = response.data.us.heroes;
                } else {
                    loadingOff();
                    alert("no such player found ["+battleTag+"]");
                    return;
                }

                //FIXME: check if player is already in array
                for (player in $scope.team.players) {
                    //console.log(player.battleTag+"  "+battleTag);
                    if ($scope.team.players[player].battleTag==battleTag) {
                        loadingOff();
                        alert("player ["+battleTag+"] already on team");
                        return;
                    }
                }

                // get all heroes (with win percentages) played more than two hours
                var heroesSortedByWin = [];
                for (hero in heroes.playtime.competitive) {
                    if (heroes.playtime.competitive[hero] >= 2) {
                        for (heroStats in heroes.stats.competitive) {
                            if (hero==heroStats) {
                                heroesSortedByWin.push({"name":hero, "win_percentage":(heroes.stats.competitive[hero].general_stats.win_percentage).slice(0,-1), "color":getColor(1-(heroes.stats.competitive[hero].general_stats.win_percentage).slice(0,-1)/100)});
                            }
                        }
                    }
                }
                // alert if player has no heroes with >= 2 hours
                if (heroesSortedByWin.length == 0) {
                    alert("player has no heros with >2 hours play time");
                }
                // sort array
                heroesSortedByWin.sort(function(a, b) {
                    return parseFloat(b.win_percentage) - parseFloat(a.win_percentage);
                });

                // get top 3
                //heroesSortedByWin = heroesSortedByWin.slice(0,3);

                // push to scope
                $scope.playerCount++;
                var player = {};
                player[battleTag]=heroesSortedByWin;
                $scope.team.players.push({name: battleTag.substring(0, battleTag.lastIndexOf("#")), battleTag:battleTag, heroes:heroesSortedByWin});
                console.log($scope.team.players);
                // if 6 players on team, generate team comps
                if ($scope.playerCount == 6) {
                    $scope.genTeamComp();
                }
                loadingOff();
            }, function errorCallback(response) {
                // called asynchronously if an error occurs
                // or server returns response with an error status.
                //FIXME: get failed error code / remove. line below is for add6 testing function
                loadingOff();
                $scope.addPlayer(battleTag);
            });


        };

        // populates scope.roles with requested role selection
        var genRolesArray = function () {
            $scope.roles = [];
            var i;
            for (i = 0; i < $scope.tankCount; i++) {
                $scope.roles.push("tank");
            }
            for (i = 0; i < $scope.dpsCount; i++) {
                $scope.roles.push("dps");
            }
            for (i = 0; i < $scope.supportCount; i++) {
                $scope.roles.push("support");
            }
        }

        var permutator = function(inputArr) {
            var results = [];
            function permute(arr, memo) {
                var cur, memo = memo || [];
                for (var i = 0; i < arr.length; i++) {
                    cur = arr.splice(i, 1);
                    if (arr.length === 0) {
                        results.push(memo.concat(cur));
                    }
                    permute(arr.slice(), memo.concat(cur));
                    arr.splice(i, 0, cur[0]);
                }
                return results;
            }
            return permute(inputArr);
        }

        var genPlayersBestHeroForRole = function (player, role, used) {
            for (hero in player.heroes) {
                let r = genRole(player.heroes[hero].name);
                if (role==r.role && used.indexOf(player.heroes[hero].name)==-1) {
                    return {name:player.heroes[hero].name, win_percentage:player.heroes[hero].win_percentage};
                }
            }
            return {name:"n/a", win_percentage:0};
        }

        //$scope.genTC = function() { genTeamComp(); }

        $scope.genTeamComp = function () {
            loadingOn();
            $scope.compositions = [];
            genRolesArray();
            let playerPermutations = permutator($scope.team.players);
            let rolePermutations = permutator($scope.roles);
            for (playerCombo in playerPermutations) {
                for (roleCombo in rolePermutations) {
                    var comp = {};
                    var used = [];
                    comp.team = [];
                    var score = 0;
                    var i;
                    for (i=0; i<6; i++) {
                        let hero = genPlayersBestHeroForRole(playerPermutations[playerCombo][i], rolePermutations[roleCombo][i], used);
                        used.push(hero.name);
                        score = parseFloat(score) + parseFloat(hero.win_percentage);
                        comp.team.push({player:playerPermutations[playerCombo][i].name, hero:hero.name});
                    }
                    comp.score = score;
                    $scope.compositions.push(comp);
                }
            }
            $scope.compositions.sort(function(a, b) {
                return parseFloat(b.score) - parseFloat(a.score);
            });
            console.log($scope.compositions[0]);
            $scope.suggestedComp = $scope.compositions[0];
            $scope.showSuggested = true;
            loadingOff();
        }

        var getColor = function (value){
            //value from 0 to 1
            var hue=((1-value)*120).toString(10);
            return ["hsl(",hue,",100%,50%)"].join("");
        }

        var genRole = function(character) {
            switch(character) {
                case "ana":
                case "lucio":
                case "mercy":
                case "symmetra":
                case "zenyatta":
                    return {"role":"support", "special":"n/a"};
                    break;
                case "genji":
                case "hanzo":
                case "reaper":
                case "tracer":
                    return {"role":"dps", "special":"flanker"};
                    break;
                case "mei":
                case "torbjorn":
                    return {"role":"dps", "special":"off-tank"};
                    break;
                case "mccree":
                case "soldier76":
                case "widowmaker":
                    return {"role":"dps", "special":"hitscan"};
                    break;
                case "junkrat":
                case "bastion":
                case "pharah":
                    return {"role":"dps", "special":"n/a"};
                    break;
                case "dva":
                case "reinhardt":
                case "roadhog":
                case "winston":
                case "zarya":
                    return {"role":"tank", "special":"n/a"};
                    break;
            }
        }




}]);
