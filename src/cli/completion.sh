#!/usr/bin/env bash

__BEAME_BIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/beame.js"

__beame_complete() {
	local cur prev words cword
	_init_completion || return

	if [[ $cword == 1 ]];then
		commands=$($__BEAME_BIN complete commands)
		COMPREPLY=( $(compgen -W "${commands[@]}" -- "$cur") )
		return
	fi

	if [[ $cword == 2 ]];then
		commands=$($__BEAME_BIN complete sub-commands "$prev")
		COMPREPLY=( $(compgen -W "${commands[@]}" -- "$cur") )
		return
	fi

	if [[ $prev == --fqdn ]];then
		switch_values=$($__BEAME_BIN complete switch-value fqdn)
		COMPREPLY=( $(compgen -W "${switch_values[@]}" -- "$cur") )
		return
	fi

	if [[ $prev == --* ]];then
		switch_values=$($__BEAME_BIN complete switch-value "${prev#--}")
		COMPREPLY=( $(compgen -W "${switch_values[@]}" -- "$cur") )
		return
	fi

	# echo $__BEAME_BIN complete switches "${words[@]:1}"
	switches=$($__BEAME_BIN complete switches "${words[@]:1}")
	COMPREPLY=( $(compgen -W "${switches[@]}" -- "$cur") )
}

complete -F __beame_complete beame
complete -F __beame_complete beame.js
