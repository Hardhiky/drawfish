import chess
import chess.engine
import sys

def get_best_draw_move(fen):
    board = chess.Board(fen)

    # Open the Stockfish engine
    with chess.engine.SimpleEngine.popen_uci("/usr/bin/stockfish") as engine:
        legal_moves = list(board.legal_moves)
        draw_moves = []

        for move in legal_moves:
            # Apply the move to the board
            board.push(move)

            # Analyze the resulting position
            info = engine.analyse(board, chess.engine.Limit(time=30.0))
            score = info["score"].relative.score(mate_score=10000)  # Get centipawn score

            # Check if the position is drawish (close to 0 centipawns)
            if score is not None and abs(score) <= 50:  # Adjust threshold as needed
                draw_moves.append((move, score))

            # Undo the move to restore the board state
            board.pop()

        # If no draw moves are found, return None
        if not draw_moves:
            return None

        # Sort draw moves by their centipawn score (closest to 0 is best)
        draw_moves.sort(key=lambda x: abs(x[1]))

        # Return the UCI notation of the best draw move
        return draw_moves[0][0].uci()

if __name__ == "__main__":
    try:
        # Get FEN from command-line argument or use the default starting position
        fen = sys.argv[1] if len(sys.argv) > 1 else chess.Board().fen()
        
        # Get the best draw move
        best_move = get_best_draw_move(fen)
        
        if best_move:
            print(best_move)  # Output the UCI move to stdout
        else:
            print("No draw moves found.", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
