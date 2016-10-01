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

        $scope.add6Players = function() {
            $scope.addPlayer("arco-1341");
            $scope.addPlayer("cRc-1211");
            $scope.addPlayer("Cheese-1219");
            $scope.addPlayer("CrotalusX-1265");
            $scope.addPlayer("Dragnier-1375");
            $scope.addPlayer("Murdock-11667");
        }

        $scope.addPlayer = function(battleTag) {
            // get api data
            $http({
                method: 'GET',
                url: "https://owapi.net/api/v3/u/"+battleTag+"/heroes"
            }).then(function successCallback(response) {
                // this callback will be called asynchronously
                // when the response is available
                // error if team already has 6 players
                if ($scope.playerCount == 6) {
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
                    alert("no such player found ["+battleTag+"]");
                    return;
                }

                //FIXME: check if player is already in array

                // get all heroes (with win percentages) played more than two hours
                var heroesSortedByWin = [];
                for (hero in heroes.playtime.competitive) {
                    if (heroes.playtime.competitive[hero] >= 2) {
                        for (heroStats in heroes.stats.competitive) {
                            if (hero==heroStats) {
                                heroesSortedByWin.push({"name":hero, "win_percentage":(heroes.stats.competitive[hero].general_stats.win_percentage).slice(0,-1)});
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
                $scope.team.players.push({battleTag:battleTag, heroes:heroesSortedByWin});
                // if 6 players on team, generate team comps
                if ($scope.playerCount == 6) {
                    genTeamComp();
                    $scope.compositions.sort(function(a, b) {
                        return parseFloat(b.score) - parseFloat(a.score);
                    });
                    console.log($scope.compositions[0]);
                    console.log($scope.compositions[1]);
                    console.log($scope.compositions[2]);
                    $scope.suggestedComp = $scope.compositions[0];
                    $scope.showSuggested = true;
                }
            }, function errorCallback(response) {
                // called asynchronously if an error occurs
                // or server returns response with an error status.
                //FIXME: get failed error code / remove. line below is for add6 testing function
                $scope.addPlayer(battleTag);
            });


        };

        // populates scope.roles with requested role selection
        var genRolesArray = function () {
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

        var genPlayersBestHeroForRole = function (player, role) {
            for (hero in player.heroes) {
                let r = genRole(player.heroes[hero].name);
                if (role==r.role) {
                    return {name:player.heroes[hero].name, win_percentage:player.heroes[hero].win_percentage};
                }
            }
            return {name:"n/a", win_percentage:0};
        }


        //FIXME: catch double hero selection
        var genTeamComp = function () {
            genRolesArray();
            let playerPermutations = permutator($scope.team.players);
            let rolePermutations = permutator($scope.roles);
            for (playerCombo in playerPermutations) {
                for (roleCombo in rolePermutations) {
                    var comp = {};
                    comp.team = [];
                    var score = 0;
                    var i;
                    for (i=0; i<6; i++) {
                        let hero = genPlayersBestHeroForRole(playerPermutations[playerCombo][i], rolePermutations[roleCombo][i]);
                        score = parseFloat(score) + parseFloat(hero.win_percentage);
                        comp.team.push({player:playerPermutations[playerCombo][i].battleTag, hero:hero.name});
                    }
                    comp.score = score;
                    $scope.compositions.push(comp);
                }
            }
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

        // sleep time expects milliseconds
        function sleep (time) {
          return new Promise((resolve) => setTimeout(resolve, time));
        }


}]);
