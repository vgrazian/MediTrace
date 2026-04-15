This document lists enhancements and fixes that still have to be performed, it needs to be updated removing stuff that has been implemented.

# need a 'Residenze' feature (can reuse 'Satnze' that we are removing)

we need to add a 'Residenze' feature as the application will be used by the same or different operator at different Residenze. We must firts understand if there is a common 'Magazzino' or split ones.
Al momento le Case alloggio , sono 2 ( una di chiama “ il Rifugio” con 5 ospiti e l’altra “Via Bellani “ con 7 ospiti)
We can use 10 as a limit of number of Ospiti and use the current Residenze names + leave space for adding 2 additional residenze called "Residenza 3" and "Residenza 4"
Need extensive testing of the feature and the 'Promemoria' should have a drop-down where Operatore selects the right 'Residenza' he is in.

# unneded stanze and letti feature

The Stanze and Letti feature is unneeded and can be safely removed, we must ensure we remove also the Letti priority feature as it is not needed too. All tests can be removed or converted to Residenze

# multi user testing

As we found out we had an issue with data looking different from different devices we need to add multi user testing on the actual online deployment to ensure different users see the same data
