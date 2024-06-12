cd packages;
for D in */;
    do if [ "$D" = "mainstay/" ]; then
        cd $D && yarn && yarn build; cd ..;
    else
        cd $D && yarn init:yarn; cd ..;
    fi
done
